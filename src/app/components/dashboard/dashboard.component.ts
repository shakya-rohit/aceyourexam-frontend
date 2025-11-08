import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatDividerModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  exams: any[] = [];
  results: any[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_TOKEN');

    if (!userData || !token) {
      this.router.navigate(['/auth']);
      return;
    }

    this.user = JSON.parse(userData);
    this.fetchExams();
    this.fetchResults();
  }

  fetchExams() {
    this.api.getExams().subscribe({
      next: (res) => {
        this.exams = res;
      },
      error: (err) => {
        console.error('Error fetching exams', err);
        alert('Failed to load exams.');
      }
    });
  }

  fetchResults() {
    // Optional: if backend expects studentId, use user.id; otherwise email
    const userId = this.user?.id;
    if (!userId) return;

    this.api.getResultsByStudent(userId).subscribe({
      next: (res) => {
        this.results = res.map((r: any) => ({
          examTitle: r.exam?.title,
          totalScore: r.totalScore,
          submittedAt: new Date(r.submittedAt).toLocaleString()
        }));
      },
      error: (err) => {
        console.error('Error fetching results', err);
      }
    });
  }

  startExam(exam: any) {
    localStorage.setItem('SELECTED_EXAM', JSON.stringify(exam));
    this.router.navigate(['/exam']);
  }

  logout() {
    localStorage.removeItem('AYE_TOKEN');
    localStorage.removeItem('AYE_USER');
    localStorage.removeItem('SELECTED_EXAM');
    this.router.navigate(['/auth']);
  }
}