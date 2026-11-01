import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { QuestionBankService } from '../../services/question-bank.service';

type FeedbackMode = 'INSTANT' | 'END';
type TimeMode = 'UNTIMED' | 'TIMED';

@Component({
  selector: 'app-practice-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './practice-runner.component.html',
  styleUrl: './practice-runner.component.css',
})
export class PracticeRunnerComponent implements OnInit, OnDestroy {
  @Input() questions: any[] = [];
  @Input() sessionId: string | null = null;
  @Input() submitError = '';
  @Input() feedbackMode: FeedbackMode = 'END';
  @Input() timeMode: TimeMode = 'TIMED';
  @Input() timeLimitMinutes = 10;
  @Input() testTitle = 'Practice test';
  @Output() finished = new EventEmitter<any>();

  currentIndex = 0;
  activeSectionIndex = 0;
  sections = [
    { name: 'Physics', questionIndexes: [] as number[] },
    { name: 'Chemistry', questionIndexes: [] as number[] },
    { name: 'Biology', questionIndexes: [] as number[] },
  ];

  markedForReview: Record<number, boolean> = {};
  visited: Record<number, boolean> = {};
  answers: Record<number, number> = {};
  timeSpent: Record<number, number> = {};
  timeLeft = 0;
  formattedTime = '00:00';
  timerSub?: Subscription;
  questionStartTime = 0;
  hasSubmitted = false;
  isFullscreen = false;

  constructor(private questionBankService: QuestionBankService) {}

  ngOnInit(): void {
    if (!this.questions?.length) return;
    this.initializeQuestions();

    if (this.timeMode === 'TIMED' && this.timeLimitMinutes > 0) {
      this.timeLeft = Math.round(this.timeLimitMinutes * 60);
      this.formattedTime = this.formatTime(this.timeLeft);
      this.startTimer();
    }
  }

  get showFeedback(): boolean {
    return this.feedbackMode === 'INSTANT';
  }

  private startTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.hasSubmitted) return;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.formattedTime = this.formatTime(this.timeLeft);
      if (this.timeLeft <= 0) this.submitExam();
    });
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private initializeQuestions(): void {
    this.sections.forEach((section) => (section.questionIndexes = []));
    this.questions = this.questions.map((question: any) => ({
      ...question,
      options: question.optionList || question.options || [],
      answered: false,
      selectedOptionIndex: null,
    }));

    this.questions.forEach((question, index) => {
      const sectionIndex = this.sections.findIndex((section) => section.name === question.subject);
      if (sectionIndex >= 0) this.sections[sectionIndex].questionIndexes.push(index);
    });

    const firstSectionIndex = this.sections.findIndex((section) => section.questionIndexes.length > 0);
    this.activeSectionIndex = Math.max(firstSectionIndex, 0);
    if (firstSectionIndex >= 0) {
      this.currentIndex = this.sections[firstSectionIndex].questionIndexes[0];
      this.visited[this.questions[this.currentIndex].id] = true;
    }
    this.questionStartTime = Date.now();
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.questions.length || index === this.currentIndex) return;
    this.recordTime();
    this.currentIndex = index;
    const sectionIndex = this.sections.findIndex((section) => section.questionIndexes.includes(index));
    if (sectionIndex >= 0) this.activeSectionIndex = sectionIndex;
    this.visited[this.questions[index].id] = true;
    this.questionStartTime = Date.now();
  }

  next(): void {
    if (this.currentIndex < this.questions.length - 1) this.goTo(this.currentIndex + 1);
  }

  prev(): void {
    if (this.currentIndex > 0) this.goTo(this.currentIndex - 1);
  }

  selectAnswer(questionId: number, optionIndex: number): void {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question || question.answerPending || (this.feedbackMode === 'INSTANT' && question.answered)) return;
    this.answers[questionId] = optionIndex;
    question.selectedOptionIndex = optionIndex;
    if (this.feedbackMode !== 'INSTANT') {
      question.answered = true;
      return;
    }

    if (!this.sessionId) {
      question.selectedOptionIndex = null;
      delete this.answers[questionId];
      question.answerError = 'This practice session expired. Please restart.';
      return;
    }
    question.answerPending = true;
    question.answerError = null;
    this.questionBankService.submitPracticeAnswer({
      sessionId: this.sessionId,
      questionId,
      selectedOptionIndex: optionIndex,
    }).subscribe({
      next: (result) => {
        question.correctOptionIndex = result.correctOptionIndex;
        question.isCorrect = result.isCorrect;
        question.answered = true;
        question.answerPending = false;
      },
      error: () => {
        delete this.answers[questionId];
        question.selectedOptionIndex = null;
        question.answered = false;
        question.answerPending = false;
        question.answerError = 'Could not check this answer. Please try again.';
      },
    });
  }

  recordTime(): void {
    if (this.hasSubmitted) return;
    const question = this.questions[this.currentIndex];
    if (!question) return;
    const seconds = Math.floor((Date.now() - this.questionStartTime) / 1000);
    this.timeSpent[question.id] = (this.timeSpent[question.id] || 0) + seconds;
    this.questionStartTime = Date.now();
  }

  submitExam(): void {
    if (this.hasSubmitted || !this.questions.length) return;
    this.recordTime();
    this.hasSubmitted = true;
    this.timerSub?.unsubscribe();

    const answers = this.questions.map((question) => ({
      questionId: Number(question.id),
      selectedOptionIndex: this.answers[question.id] ?? null,
    }));
    this.finished.emit({
      answers,
    });
  }

  retrySubmission(): void {
    this.hasSubmitted = false;
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    if (!this.hasSubmitted) this.recordTime();
  }

  get currentQuestion(): any {
    return this.questions[this.currentIndex];
  }

  toggleReview(): void {
    if (!this.currentQuestion) return;
    const questionId = this.currentQuestion.id;
    this.markedForReview[questionId] = !this.markedForReview[questionId];
  }

  isMarkedForReview(questionId: number): boolean {
    return !!this.markedForReview[questionId];
  }

  switchSection(index: number): void {
    const firstQuestionIndex = this.sections[index]?.questionIndexes[0];
    if (firstQuestionIndex !== undefined) {
      this.activeSectionIndex = index;
      this.goTo(firstQuestionIndex);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  @HostListener('document:keydown.f')
  onFKey(): void {
    this.toggleFullscreen();
  }
}
