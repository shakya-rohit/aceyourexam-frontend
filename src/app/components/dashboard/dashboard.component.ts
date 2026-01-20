import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatTabsModule } from '@angular/material/tabs';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatTabsModule,
    BaseChartDirective // ✅ required for <canvas baseChart>
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  user: any = null;
  exams: any[] = [];
  results: any[] = [];

  totalExams = 0;
  averageScore = 0;
  bestScore = 0;
  recommendations: string[] = [];

  selectedExamTab = 0; // 0 = Upcoming (default)

  upcomingExams: any[] = [];
  pastExams: any[] = [];

  subjectFilters = [
    { label: 'Total', visible: true },
    { label: 'Physics', visible: true },
    { label: 'Chemistry', visible: true },
    { label: 'Biology', visible: true }
  ];

  // ---------- CHART CONFIG ----------
  // lineChartData: ChartConfiguration<'line'>['data'] = {
  //   labels: [],
  //   datasets: [
  //     {
  //       data: [],
  //       label: 'Performance Over Time',
  //       fill: true,
  //       tension: 0.4,
  //       borderColor: '#3f51b5',
  //       backgroundColor: 'rgba(63,81,181,0.15)',
  //       pointBackgroundColor: '#3f51b5',
  //       pointRadius: 4
  //     }
  //   ]
  // };

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Total',
        data: [],
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63,81,181,0.15)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Physics',
        data: [],
        borderColor: '#e53935',
        backgroundColor: 'rgba(229,57,53,0.15)',
        tension: 0.4
      },
      {
        label: 'Chemistry',
        data: [],
        borderColor: '#fb8c00',
        backgroundColor: 'rgba(251,140,0,0.15)',
        tension: 0.4
      },
      {
        label: 'Biology',
        data: [],
        borderColor: '#43a047',
        backgroundColor: 'rgba(67,160,71,0.15)',
        tension: 0.4
      }
    ]
  };


  // lineChartOptions: ChartConfiguration<'line'>['options'] = {
  //   responsive: true,
  //   plugins: {
  //     legend: { display: false },
  //     tooltip: {
  //       enabled: true,
  //       backgroundColor: '#3f51b5',
  //       titleColor: '#fff',
  //       bodyColor: '#fff'
  //     }
  //   },
  //   scales: {
  //     x: { grid: { display: false } },
  //     y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
  //   }
  // };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 720
      }
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

  // fetchExams() {
  //   this.api.getExams().subscribe({
  //     next: (res) => (this.exams = res),
  //     error: (err) => {
  //       console.error('Error fetching exams', err);
  //       alert('Failed to load exams.');
  //     }
  //   });
  // }

  fetchExams() {
    this.api.getExams().subscribe({
      next: (res) => {
        this.exams = res;
        this.categorizeExams(); // 👈 NEW
      },
      error: (err) => {
        console.error('Error fetching exams', err);
        alert('Failed to load exams.');
      }
    });
  }

  categorizeExams() {
    if (!this.exams.length) return;

    const attemptedExamIds = new Set(
      this.results.map(r => r.examId)
    );

    this.upcomingExams = this.exams.filter(
      exam => !attemptedExamIds.has(exam.id)
    );

    this.pastExams = this.exams.filter(
      exam => attemptedExamIds.has(exam.id)
    );
  }


  // fetchResults() {
  //   const userId = this.user?.id;
  //   if (!userId) return;

  //   this.api.getResultsByStudent(userId).subscribe({
  //     next: (res) => {
  //       this.results = res.map((r: any) => ({
  //         examTitle: r.examTitle || 'unknown title',
  //         totalScore: r.totalScore,
  //         submittedAt: new Date(r.submittedAt).toLocaleString()
  //       }));

  //       this.calculateStats();
  //       this.updateChart();
  //       this.generateRecommendations();
  //     },
  //     error: (err) => console.error('Error fetching results', err)
  //   });
  // }

  fetchResults() {
    const userId = this.user?.id;
    if (!userId) return;

    this.api.getResultsByStudent(userId).subscribe({
      next: (res) => {
        this.results = res.map((r: any) => ({
          examId: r.examId,
          examTitle: r.examTitle,
          totalScore: r.totalScore,
          physics: r.subjects?.physics ?? 0,
          chemistry: r.subjects?.chemistry ?? 0,
          biology: r.subjects?.biology ?? 0,
          submittedAt: new Date(r.submittedAt).toLocaleString()
        }));

        this.calculateStats();
        this.updateChart();
        this.generateRecommendations();
        this.categorizeExams();
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

  // updateChart() {
  //   this.lineChartData.labels = this.results.map((r) => r.examTitle);
  //   this.lineChartData.datasets[0].data = this.results.map((r) => r.totalScore);
  // }

  updateChart() {
    this.lineChartData.labels = this.results.map(r => r.examTitle);

    this.lineChartData.datasets[0].data =
      this.results.map(r => r.totalScore);

    this.lineChartData.datasets[1].data =
      this.results.map(r => r.physics);

    this.lineChartData.datasets[2].data =
      this.results.map(r => r.chemistry);

    this.lineChartData.datasets[3].data =
      this.results.map(r => r.biology);
    
    this.lineChartData.datasets.forEach((dataset: any) => {
      const filter = this.subjectFilters.find(f => f.label === dataset.label);
      dataset.hidden = filter ? !filter.visible : false;
    });

    this.chart?.update();
  }

  toggleDataset(label: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  // 1️⃣ Update filter state
  const filter = this.subjectFilters.find(f => f.label === label);
    if (filter) {
      filter.visible = checked;
    }

    // 2️⃣ Update dataset visibility
    const dataset = this.lineChartData.datasets.find(
      d => d.label === label
    ) as any;

    if (dataset) {
      dataset.hidden = !checked;
    }

    // 3️⃣ Force chart redraw
    this.chart?.update();
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
