import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';

interface Exam {
  id: number;
  title: string;
  duration: number;
  totalMarks: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatDividerModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  exams: Exam[] = [];
  results: any[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('AYE_USER');
    if (!userStr) {
      this.router.navigate(['/auth']);
      return;
    }
    this.user = JSON.parse(userStr);

    this.exams = [
      { id: 1, title: 'NEET Mock Test 1', duration: 180, totalMarks: 720 },
      { id: 2, title: 'NEET Mock Test 2', duration: 180, totalMarks: 720 },
      { id: 3, title: 'NEET Mock Test 3', duration: 180, totalMarks: 720 },
    ];

    const res = localStorage.getItem('AYE_RESULTS');
    this.results = res ? JSON.parse(res) : [];
  }

  startExam(exam: Exam) {
    localStorage.setItem('AYE_CURRENT_EXAM', JSON.stringify(exam));
    this.router.navigate(['/exam']);
  }

  logout() {
    localStorage.removeItem('AYE_LOGGED_IN');
    this.router.navigate(['/auth']);
  }
}