import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-practice-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './practice-runner.component.html',
  styleUrl: './practice-runner.component.css'
})
export class PracticeRunnerComponent implements OnInit, OnDestroy {

  @Input() questions: any[] = [];
  currentIndex = 0;

  @Output() finished = new EventEmitter<any>();


  sections = [
    { name: 'Physics', questionIndexes: [] as number[] },
    { name: 'Chemistry', questionIndexes: [] as number[] },
    { name: 'Biology', questionIndexes: [] as number[] }
  ];

  activeSectionIndex = 0;


  markedForReview: Record<number, boolean> = {};
  visited: Record<number, boolean> = {};


  exam: any;

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

  this.timeLeft = 60;
  this.startTimer();

  if (!this.questions || this.questions.length === 0) {
    console.warn('No questions received in PracticeRunner');
    return;
  }

  this.initializeQuestions();
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

  initializeQuestions() {

  this.sections.forEach(sec => sec.questionIndexes = []);

  this.questions = this.questions.map((q: any) => ({
    ...q,
    options: q.optionList || q.options,
    answered: false,
    selectedOptionIndex: -1
  }));

  this.questions.forEach((q, index) => {
    if (q.subject === 'Physics') {
      this.sections[0].questionIndexes.push(index);
    } else if (q.subject === 'Chemistry') {
      this.sections[1].questionIndexes.push(index);
    } else if (q.subject === 'Biology') {
      this.sections[2].questionIndexes.push(index);
    }
  });

  this.activeSectionIndex = 0;

  if (this.sections[0].questionIndexes.length > 0) {
    this.currentIndex = this.sections[0].questionIndexes[0];
    this.visited[this.questions[this.currentIndex].id] = true;
  }

  this.questionStartTime = Date.now();
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

  selectAnswer(qId: number, optionIndex: number) {
  this.answers[qId] = optionIndex;

  const q = this.questions.find(q => q.id === qId);
  if (q) {
    q.selectedOptionIndex = optionIndex;
    q.answered = true;
  }
}


  recordTime() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const sec = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timeSpent[q.id] = (this.timeSpent[q.id] || 0) + sec;
  }

  /* ---------------- SUBMIT ---------------- */

  submitExam() {

    const total = this.questions.length;

    const correct = this.questions.filter(q =>
      this.answers[q.id] === q.correctOptionIndex
    ).length;

    const wrong = total - correct;

    const skipped = total - Object.keys(this.answers).length;

    const result = {
      total,
      correct,
      wrong,
      skipped,
      percentage: Math.round((correct / total) * 100)
    };

    this.finished.emit(result);
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

  isFullscreen = false;

  toggleFullscreen() {
    if (!this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  enterFullscreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }

    this.isFullscreen = true;
  }

  exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    this.isFullscreen = false;
  }

  // ✅ Detect ESC key or browser exit
  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  @HostListener('document:keydown.f')
  onFKey() {
    this.toggleFullscreen();
  }

  ngAfterViewInit() {
    this.enterFullscreen();
  }





}
