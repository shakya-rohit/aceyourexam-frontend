import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, concatMap, interval, of, Subject, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from '../../services/api.service';
import { ConfirmActionDialogComponent } from '../../shared/confirm-action-dialog.component';

@Component({
  selector: 'app-exam-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './exam-runner.component.html',
  styleUrls: ['./exam-runner.component.css']
})
export class ExamRunnerComponent implements OnInit, OnDestroy {

  sections: { name: string; questionIndexes: number[] }[] = [];

  activeSectionIndex = 0;


  markedForReview: Record<number, boolean> = {};
  visited: Record<number, boolean> = {};


  exam: any;
  questions: any[] = [];
  currentIndex = 0;

  answers: Record<number, any> = {};
  timeSpent: Record<number, number> = {};

  // ⏱ Timer
  timeLeft = 0;
  formattedTime = '00:00';
  timerSub?: Subscription;

  questionStartTime = 0;
  isSubmitting = false;
  hasSubmitted = false;
  loadingQuestions = true;
  questionLoadError = '';
  submitError = '';
  attemptId?: number;
  saveStatus = '';
  private answerSaveQueue = new Subject<{ questionId: number; selectedOptionIndex: number | null; timeSpent: number; markedForReview: boolean }>();
  private lastTimeCheckpoint = Date.now();

  constructor(
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const examData = localStorage.getItem('SELECTED_EXAM');
    if (!examData) {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      this.exam = JSON.parse(examData);
    } catch {
      localStorage.removeItem('SELECTED_EXAM');
      this.router.navigate(['/dashboard']);
      return;
    }
    this.answerSaveQueue.pipe(concatMap(answer => this.api.saveAttemptAnswer(this.attemptId!, answer.questionId, {
      selectedOptionIndex: answer.selectedOptionIndex,
      timeSpent: answer.timeSpent,
      markedForReview: answer.markedForReview
    }).pipe(catchError(() => {
      return of('SAVE_FAILED');
    })))).subscribe({
      next: result => this.saveStatus = result === 'SAVE_FAILED'
        ? 'Could not save changes. Check your connection.'
        : 'All changes saved',
      error: () => this.saveStatus = 'Could not save changes. Check your connection.'
    });
    this.loadQuestions();
  }

  /* ---------------- TIMER ---------------- */

  startTimer() {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.hasSubmitted || this.isSubmitting) return;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.formattedTime = this.formatTime(this.timeLeft);

      if (Date.now() - this.lastTimeCheckpoint >= 15000) {
        this.recordTime();
        this.lastTimeCheckpoint = Date.now();
      }

      if (this.timeLeft <= 0) {
        this.timerSub?.unsubscribe();
        this.submitExam(true);
      }
    });
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /* ---------------- QUESTIONS ---------------- */

  loadQuestions() {
    this.loadingQuestions = true;
    this.questionLoadError = '';
    this.api.startOrResumeExam(this.exam.id).subscribe({
      next: res => {
        this.loadingQuestions = false;
        this.attemptId = res.attemptId;
        (res.answers || []).forEach((answer: any) => {
          if (answer.selectedOptionIndex !== null && answer.selectedOptionIndex !== undefined) this.answers[answer.questionId] = answer.selectedOptionIndex;
          this.timeSpent[answer.questionId] = answer.timeSpent || 0;
          this.markedForReview[answer.questionId] = !!answer.markedForReview;
        });
        // Reset data (important if component reloads)
        this.questions = [];
        this.sections = [];

        this.questions = (res.questions || []).map((q: any) => ({
          ...q,
          options: q.optionList,
          type: 'SINGLE_CORRECT'
        }));

        // Build sections from the subjects actually present in this exam.
        const sectionsBySubject = new Map<string, { name: string; questionIndexes: number[] }>();
        this.questions.forEach((q, index) => {
          const subject = String(q.subject || 'Other').trim() || 'Other';
          let section = sectionsBySubject.get(subject);
          if (!section) {
            section = { name: subject, questionIndexes: [] };
            sectionsBySubject.set(subject, section);
          }
          section.questionIndexes.push(index);
        });
        this.sections = Array.from(sectionsBySubject.values());

        // Default to the first available subject section.
        this.activeSectionIndex = 0;
        const firstQuestionIndex = this.sections[0]?.questionIndexes[0];
        if (firstQuestionIndex !== undefined) {
          this.currentIndex = firstQuestionIndex;
          this.visited[this.questions[this.currentIndex].id] = true;
        }

        this.questionStartTime = Date.now();
        if (!this.questions.length) {
          this.questionLoadError = 'This exam does not have any questions yet. Please contact the exam administrator.';
          return;
        }
        this.timeLeft = Math.max(0, Number(res.remainingSeconds) || 0);
        this.formattedTime = this.formatTime(this.timeLeft);
        if (this.timeLeft === 0) this.submitExam(true);
        else this.startTimer();
      },
      error: () => {
        this.loadingQuestions = false;
        this.questionLoadError = 'We couldn’t load the exam questions. Check your connection and try again.';
      }
    });
  }

  retryLoadQuestions(): void {
    this.loadQuestions();
  }


  goTo(index: number) {
    if (index < 0 || index >= this.questions.length || index === this.currentIndex) return;
    this.recordTime();
    this.currentIndex = index;
    const sectionIndex = this.sections.findIndex(section => section.questionIndexes.includes(index));
    if (sectionIndex >= 0) {
      this.activeSectionIndex = sectionIndex;
    }
    this.visited[this.questions[index].id] = true;
    this.questionStartTime = Date.now();
  }


  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.goTo(this.currentIndex + 1);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.goTo(this.currentIndex - 1);
    }
  }

  /* ---------------- ANSWERS ---------------- */

  selectAnswer(qId: number, value: any) {
    this.answers[qId] = value;
    this.queueAnswerSave(qId);
  }

  recordTime() {
    if (this.hasSubmitted) return;
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const sec = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timeSpent[q.id] = (this.timeSpent[q.id] || 0) + sec;
    this.questionStartTime = Date.now();
    this.lastTimeCheckpoint = this.questionStartTime;
    this.queueAnswerSave(q.id);
  }

  private queueAnswerSave(questionId: number): void {
    if (!this.attemptId || this.hasSubmitted || this.timeLeft <= 0) return;
    this.saveStatus = 'Saving…';
    this.answerSaveQueue.next({
      questionId,
      selectedOptionIndex: this.answers[questionId] ?? null,
      timeSpent: this.timeSpent[questionId] || 0,
      markedForReview: !!this.markedForReview[questionId]
    });
  }

  /* ---------------- SUBMIT ---------------- */

  submitExam(autoSubmitted = false) {
    if (this.isSubmitting || this.hasSubmitted || !this.questions.length) return;
    const reviewCount = Object.values(this.markedForReview).filter(v => v).length;

    if (autoSubmitted) {
      this.submitConfirmedExam();
      return;
    }

    const messages = reviewCount > 0
      ? [`${reviewCount} question${reviewCount === 1 ? ' is' : 's are'} marked for review.`, 'Are you sure you want to submit the exam?']
      : ['Are you sure you want to submit the exam?'];
    this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel',
      data: { title: 'Submit exam?', messages, confirmLabel: 'Submit', danger: false }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) this.submitConfirmedExam();
    });
  }

  private submitConfirmedExam(): void {
    if (this.isSubmitting || this.hasSubmitted || !this.questions.length) return;

    this.recordTime();
    this.isSubmitting = true;
    this.submitError = '';
    this.timerSub?.unsubscribe();

    const payload = {
      answers: this.questions.map(q => ({
        questionId: q.id,
        selectedOptionIndex: this.answers[q.id] ?? null,
        timeSpent: this.timeSpent[q.id] || 0,
        markedForReview: this.markedForReview[q.id] || false
      }))
    };

    if (!this.attemptId) {
      this.isSubmitting = false;
      this.submitError = 'The attempt session is not ready. Please reload the exam.';
      return;
    }
    this.api.submitAttempt(this.attemptId, payload).subscribe({
      next: res => {
        this.hasSubmitted = true;
        localStorage.setItem('LAST_RESULT', JSON.stringify(res));
        this.router.navigate(['/results']);
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = 'Your answers could not be submitted. Your selections are still on this page; please try again.';
      }
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.recordTime();
  }

  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  toggleReview() {
    if (!this.currentQuestion) return;
    const qId = this.currentQuestion.id;
    this.markedForReview[qId] = !this.markedForReview[qId];
    this.queueAnswerSave(qId);
  }

  isMarkedForReview(qId: number): boolean {
    return !!this.markedForReview[qId];
  }

  switchSection(index: number) {
    const firstQuestionIndex = this.sections[index]?.questionIndexes[0];
    if (firstQuestionIndex !== undefined) {
      this.goTo(firstQuestionIndex);
    }
  }

  trackByIndex(index: number, value: any) {
    return value;
  }



}
