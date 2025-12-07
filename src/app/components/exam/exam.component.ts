import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatRadioModule, MatDividerModule],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css']
})
export class ExamComponent implements OnInit, OnDestroy {
  exam: any = null;
  questions: any[] = [];
  currentIndex = 0;
  selectedAnswers: { [key: number]: number } = {};

  // ⏱️ Timer for exam duration
  timeLeft = 0;
  formattedTime = '00:00';
  timerSub?: Subscription;

  // 🕒 Per-question time tracking
  questionStartTime = 0;
  timeSpent: { [questionId: number]: number } = {};

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const examData = localStorage.getItem('SELECTED_EXAM');
    if (!examData) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.exam = JSON.parse(examData);
    this.timeLeft = (this.exam.durationMinutes || 1) * 60; // seconds
    this.startTimer();
    this.fetchQuestions();
  }

  startTimer() {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.formattedTime = this.formatTime(this.timeLeft);
      } else {
        this.submitExam();
      }
    });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  fetchQuestions() {
    this.api.getQuestionsByExam(this.exam.id).subscribe({
      next: (res) => {
        this.questions = res.map((q: any) => ({
          ...q,
          options: q.options.split('||')
        }));

        // ⏱️ Start tracking the first question
        if (this.questions.length > 0) {
          this.questionStartTime = Date.now();
        }
      },
      error: (err) => {
        console.error('Error fetching questions', err);
        alert('Failed to load questions');
      }
    });
  }

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.recordTimeForCurrentQuestion();
      this.currentIndex++;
      this.questionStartTime = Date.now();
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.recordTimeForCurrentQuestion();
      this.currentIndex--;
      this.questionStartTime = Date.now();
    }
  }

  // ⏱️ Record how long the user viewed the current question
  recordTimeForCurrentQuestion() {
    const currentQuestion = this.questions[this.currentIndex];
    if (!currentQuestion || !this.questionStartTime) return;

    const now = Date.now();
    const secondsSpent = Math.floor((now - this.questionStartTime) / 1000);
    const qId = currentQuestion.id;

    this.timeSpent[qId] = (this.timeSpent[qId] || 0) + secondsSpent;
  }

  selectOption(questionId: number, optionIndex: number) {
    this.selectedAnswers[questionId] = optionIndex;
  }

  submitExam() {
    if (!confirm('Are you sure you want to submit the exam?')) return;

    // 🕒 Record time for the last question before submission
    this.recordTimeForCurrentQuestion();

    // Prepare payload
    const answers = this.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIndex: this.selectedAnswers[q.id] ?? null,
      timeSpent: this.timeSpent[q.id] || 0 // ⏱️ Added field
    }));

    this.api.submitExam(this.exam.id, { answers }).subscribe({
      next: (res) => {
        alert(`Exam submitted!\nScore: ${res.totalScore}\nFeedback: ${res.feedback}`);
        localStorage.setItem('LAST_RESULT', JSON.stringify(res));
        this.router.navigate(['/results']);
      },
      error: (err) => {
        console.error('Submit error', err);
        alert('Error submitting exam');
      }
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    // Ensure last question time is saved even if user leaves mid-exam
    this.recordTimeForCurrentQuestion();
  }
}
