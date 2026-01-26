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

    const lastResult = localStorage.getItem('LAST_RESULT');
    if (lastResult) {
      const res = JSON.parse(lastResult);
      this.results = [
        {
          examTitle: res.examTitle || 'Recent Exam',
          totalScore: res.totalScore,
          submittedAt: new Date().toLocaleString(),
          attemptId: res.attemptId || null
        }
      ];
      localStorage.removeItem('LAST_RESULT');
    } else {
      this.api.getResultsByStudent(parsedUser.id).subscribe({
        next: (res) => {
          this.results = res.map((r: any) => ({
            attemptId: r.id,
            examTitle: r.examTitle || 'Untitled Exam',
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

  // ✅ Navigate to the detailed analysis page
  viewAnalysis(result: any) {
    if (result.attemptId) {
      this.router.navigate(['/analysis', result.attemptId]);
    } else {
      alert('No detailed data available for this attempt.');
    }
  }

  getScoreClass(score: number) {
  if (score >= 600) return 'excellent';
  if (score >= 400) return 'good';
  if (score >= 200) return 'average';
  return 'poor';
}

}
