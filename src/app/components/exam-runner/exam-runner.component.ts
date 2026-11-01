import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

import { ApiService } from '../../services/api.service';

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

  constructor(
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const examData = localStorage.getItem('SELECTED_EXAM');
    if (!examData) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.exam = JSON.parse(examData);
    this.loadQuestions();
  }

  /* ---------------- TIMER ---------------- */

  startTimer() {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.hasSubmitted || this.isSubmitting) return;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.formattedTime = this.formatTime(this.timeLeft);

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
    this.api.getQuestionsForAttempt(this.exam.id).subscribe({
      next: res => {
        // Reset data (important if component reloads)
        this.questions = [];
        this.sections = [];

        this.questions = (res || []).map((q: any) => ({
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
          alert('This exam does not have any questions yet.');
          return;
        }
        this.timeLeft = Math.max(1, Number(this.exam.durationMinutes) || 1) * 60;
        this.formattedTime = this.formatTime(this.timeLeft);
        this.startTimer();
      },
      error: () => alert('Failed to load questions')
    });
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
  }

  recordTime() {
    if (this.hasSubmitted) return;
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const sec = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timeSpent[q.id] = (this.timeSpent[q.id] || 0) + sec;
  }

  /* ---------------- SUBMIT ---------------- */

  submitExam(autoSubmitted = false) {
    if (this.isSubmitting || this.hasSubmitted || !this.questions.length) return;
    const reviewCount = Object.values(this.markedForReview).filter(v => v).length;

    if (!autoSubmitted && reviewCount > 0) {
      const proceed = confirm(
        `You have ${reviewCount} questions marked for review. Submit anyway?`
      );
      if (!proceed) return;
    } else if (!autoSubmitted) {
      if (!confirm('Submit exam?')) return;
    }

    this.recordTime();
    this.isSubmitting = true;
    this.timerSub?.unsubscribe();

    const payload = {
      answers: this.questions.map(q => ({
        questionId: q.id,
        selectedOptionIndex: this.answers[q.id] ?? null,
        timeSpent: this.timeSpent[q.id] || 0,
        markedForReview: this.markedForReview[q.id] || false
      }))
    };

    this.api.submitExam(this.exam.id, payload).subscribe({
      next: res => {
        this.hasSubmitted = true;
        localStorage.setItem('LAST_RESULT', JSON.stringify(res));
        this.router.navigate(['/results']);
      },
      error: () => {
        this.isSubmitting = false;
        alert('Submit failed. Please try again.');
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
