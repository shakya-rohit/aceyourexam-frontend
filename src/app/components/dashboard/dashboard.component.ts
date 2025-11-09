import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    BaseChartDirective // ✅ required for <canvas baseChart>
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  exams: any[] = [];
  results: any[] = [];

  totalExams = 0;
  averageScore = 0;
  bestScore = 0;
  recommendations: string[] = [];

  // ---------- CHART CONFIG ----------
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Performance Over Time',
        fill: true,
        tension: 0.4,
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63,81,181,0.15)',
        pointBackgroundColor: '#3f51b5',
        pointRadius: 4
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#3f51b5',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
    }
  };

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
      next: (res) => (this.exams = res),
      error: (err) => {
        console.error('Error fetching exams', err);
        alert('Failed to load exams.');
      }
    });
  }

  fetchResults() {
    const userId = this.user?.id;
    if (!userId) return;

    this.api.getResultsByStudent(userId).subscribe({
      next: (res) => {
        this.results = res.map((r: any) => ({
          examTitle: r.exam?.title,
          totalScore: r.totalScore,
          submittedAt: new Date(r.submittedAt).toLocaleString()
        }));

        this.calculateStats();
        this.updateChart();
        this.generateRecommendations();
      },
      error: (err) => console.error('Error fetching results', err)
    });
  }

  calculateStats() {
    this.totalExams = this.results.length;
    if (this.results.length > 0) {
      const scores = this.results.map((r) => r.totalScore);
      this.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      this.bestScore = Math.max(...scores);
    }
  }

  updateChart() {
    this.lineChartData.labels = this.results.map((r) => r.examTitle);
    this.lineChartData.datasets[0].data = this.results.map((r) => r.totalScore);
  }

  generateRecommendations() {
    if (this.results.length === 0) return;

    const lastScore = this.results[this.results.length - 1].totalScore;
    if (lastScore < 400) {
      this.recommendations = [
        'Focus on your weak subjects using practice tests.',
        'Try NEET Mock Test Series 2 for improvement.'
      ];
    } else if (lastScore < 600) {
      this.recommendations = ['You are improving! Try advanced-level mocks next.'];
    } else {
      this.recommendations = ['Excellent performance! Attempt more full-length mocks.'];
    }
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
