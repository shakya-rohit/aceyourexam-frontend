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

  sections = [
    { name: 'Physics', questionIndexes: [] as number[] },
    { name: 'Chemistry', questionIndexes: [] as number[] },
    { name: 'Biology', questionIndexes: [] as number[] }
  ];

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
    this.timeLeft = (this.exam.durationMinutes || 1) * 60;

    this.startTimer();
    this.loadQuestions();
  }

  /* ---------------- TIMER ---------------- */

  startTimer() {
    this.timerSub = interval(1000).subscribe(() => {
      this.timeLeft--;
      this.formattedTime = this.formatTime(this.timeLeft);

      if (this.timeLeft <= 0) {
        this.submitExam();
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
    this.api.getQuestionsByExam(this.exam.id).subscribe({
      next: res => {
        // Reset data (important if component reloads)
        this.questions = [];
        this.sections.forEach(sec => sec.questionIndexes = []);

        this.questions = res.map((q: any) => ({
          ...q,
          options: q.optionList,
          type: 'SINGLE_CORRECT'
        }));

        // ✅ Assign questions to sections AFTER data arrives
        this.questions.forEach((q, index) => {
          if (q.subject === 'Physics') {
            this.sections[0].questionIndexes.push(index);
          } else if (q.subject === 'Chemistry') {
            this.sections[1].questionIndexes.push(index);
          } else if (q.subject === 'Biology') {
            this.sections[2].questionIndexes.push(index);
          }
          else {
            console.warn('Unknown subject:', q.subject);
          }

        });

        // Default to first section’s first question
        this.activeSectionIndex = 0;
        if (this.sections[0].questionIndexes.length > 0) {
          this.currentIndex = this.sections[0].questionIndexes[0];
          this.visited[this.questions[this.currentIndex].id] = true;
        }

        this.questionStartTime = Date.now();
      },
      error: () => alert('Failed to load questions')
    });
  }


  goTo(index: number) {
    this.recordTime();
    this.currentIndex = index;
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
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const sec = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timeSpent[q.id] = (this.timeSpent[q.id] || 0) + sec;
  }

  /* ---------------- SUBMIT ---------------- */

  submitExam() {
    const reviewCount = Object.values(this.markedForReview).filter(v => v).length;

    if (reviewCount > 0) {
      const proceed = confirm(
        `You have ${reviewCount} questions marked for review. Submit anyway?`
      );
      if (!proceed) return;
    } else {
      if (!confirm('Submit exam?')) return;
    }

    this.recordTime();
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
        localStorage.setItem('LAST_RESULT', JSON.stringify(res));
        this.router.navigate(['/results']);
      },
      error: () => alert('Submit failed')
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
    const qId = this.currentQuestion.id;
    this.markedForReview[qId] = !this.markedForReview[qId];
  }

  isMarkedForReview(qId: number): boolean {
    return !!this.markedForReview[qId];
  }

  switchSection(index: number) {
    this.recordTime();
    this.activeSectionIndex = index;

    const firstQuestionIndex = this.sections[index].questionIndexes[0];
    if (firstQuestionIndex !== undefined) {
      this.currentIndex = firstQuestionIndex;
      this.questionStartTime = Date.now();
    }
  }

  trackByIndex(index: number, value: any) {
    return value;
  }



}
