import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,          // ✅ Needed for [(ngModel)]
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatDividerModule      // ✅ Needed for <mat-divider>
  ],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css']
})
export class ExamComponent implements OnInit, OnDestroy {
  exam: any = null;
  questions: Question[] = [];
  currentIndex = 0;
  selectedAnswers: { [id: number]: number } = {};
  timer: number = 180 * 60; // 180 minutes
  intervalId: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const examStr = localStorage.getItem('AYE_CURRENT_EXAM');
    if (!examStr) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.exam = JSON.parse(examStr);

    // Mock questions
    this.questions = [
      { id: 1, text: 'What is the SI unit of force?', options: ['Joule', 'Newton', 'Pascal', 'Watt'], correct: 1 },
      { id: 2, text: 'Which gas is most abundant in the Earth’s atmosphere?', options: ['Oxygen', 'Nitrogen', 'CO₂', 'Argon'], correct: 1 },
      { id: 3, text: 'What is the chemical symbol for Sodium?', options: ['So', 'Na', 'S', 'N'], correct: 1 },
    ];

    this.startTimer();
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        this.submitExam();
      }
    }, 1000);
  }

  get formattedTime() {
    const min = Math.floor(this.timer / 60);
    const sec = this.timer % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  selectOption(qId: number, index: number) {
    this.selectedAnswers[qId] = index;
  }

  submitExam() {
    clearInterval(this.intervalId);
    let score = 0;
    this.questions.forEach(q => {
      if (this.selectedAnswers[q.id] === q.correct) score += 4; // +4 marks
    });

    const result = {
      examTitle: this.exam.title,
      totalScore: score,
      submittedAt: new Date().toLocaleString(),
    };

    const existing = JSON.parse(localStorage.getItem('AYE_RESULTS') || '[]');
    existing.push(result);
    localStorage.setItem('AYE_RESULTS', JSON.stringify(existing));

    alert(`Exam submitted! You scored ${score} marks.`);
    this.router.navigate(['/results']);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}