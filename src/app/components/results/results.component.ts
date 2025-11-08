import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  results: any[] = [];

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const user = localStorage.getItem('AYE_USER');
    if (!user) {
      this.router.navigate(['/auth']);
      return;
    }

    const parsedUser = JSON.parse(user);

    // Try to load the most recent result (from submission)
    const lastResult = localStorage.getItem('LAST_RESULT');
    if (lastResult) {
      const res = JSON.parse(lastResult);
      this.results = [
        {
          examTitle: res.examTitle || 'Recent Exam',
          totalScore: res.totalScore,
          submittedAt: new Date().toLocaleString()
        }
      ];

      // Clear it so it doesn’t persist forever
      localStorage.removeItem('LAST_RESULT');
    } else {
      // Fetch all results from backend
      this.api.getResultsByStudent(parsedUser.id).subscribe({
        next: (res) => {
          this.results = res.map((r: any) => ({
            examTitle: r.exam?.title || 'Untitled Exam',
            totalScore: r.totalScore,
            submittedAt: new Date(r.submittedAt).toLocaleString()
          }));
        },
        error: (err) => {
          console.error('Error fetching results', err);
          alert('Unable to load results.');
        }
      });
    }
  }

  getFeedback(score: number): string {
    if (score >= 600) return 'Excellent performance! 🏆';
    if (score >= 400) return 'Good job! Keep practicing.';
    if (score >= 200) return 'Needs improvement — review key topics.';
    return 'Focus on fundamentals and time management.';
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}