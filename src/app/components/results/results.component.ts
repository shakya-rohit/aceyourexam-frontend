import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

interface AttemptResult {
  attemptId: number;
  examId: number;
  examTitle: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  submittedAt: string;
  maxScore: number;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
})
export class ResultsComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  attempts: AttemptResult[] = [];
  loading = true;
  loadError = false;
  selectedExamTitle = 'ALL';
  sortOrder: 'NEWEST' | 'OLDEST' | 'HIGHEST' = 'NEWEST';

  readonly chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Score',
        data: [],
        borderColor: '#4053b8',
        backgroundColor: 'rgba(64, 83, 184, 0.12)',
        pointBackgroundColor: '#4053b8',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.parsed.y}% of available marks`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: { precision: 0, callback: (value) => `${value}%` },
        title: { display: true, text: 'Score (%)' },
      },
    },
  };

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('AYE_USER');
    if (!userData) {
      this.router.navigate(['/auth']);
      return;
    }

    let studentId: number;
    try {
      studentId = Number(JSON.parse(userData)?.id);
    } catch {
      this.router.navigate(['/auth']);
      return;
    }

    // The persisted attempt list is the source of truth. Clear the one-time
    // submit response so a refresh cannot replace history with a single card.
    localStorage.removeItem('LAST_RESULT');
    this.loadAttempts(studentId);
  }

  private loadAttempts(studentId: number): void {
    this.loading = true;
    this.api.getResultsByStudent(studentId).subscribe({
      next: (response) => {
        this.attempts = (Array.isArray(response) ? response : [])
          .map((result: any) => ({
            attemptId: Number(result.id),
            examId: Number(result.examId),
            examTitle: result.examTitle || 'Untitled exam',
            totalScore: Number(result.totalScore) || 0,
            correctCount: Number(result.correctCount) || 0,
            wrongCount: Number(result.wrongCount) || 0,
            accuracy: Number(result.accuracy) || 0,
            submittedAt: result.submittedAt,
            maxScore: Number(result.totalMarks) || 720,
          }))
          .sort((a, b) => this.timestamp(b.submittedAt) - this.timestamp(a.submittedAt));

        this.loading = false;
        this.updateChart();
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  get filteredAttempts(): AttemptResult[] {
    const filtered = this.selectedExamTitle === 'ALL'
      ? [...this.attempts]
      : this.attempts.filter((attempt) => attempt.examTitle === this.selectedExamTitle);

    if (this.sortOrder === 'OLDEST') {
      return filtered.sort((a, b) => this.timestamp(a.submittedAt) - this.timestamp(b.submittedAt));
    }
    if (this.sortOrder === 'HIGHEST') {
      return filtered.sort((a, b) => this.scorePercent(b) - this.scorePercent(a));
    }
    return filtered.sort((a, b) => this.timestamp(b.submittedAt) - this.timestamp(a.submittedAt));
  }

  get examTitles(): string[] {
    return Array.from(new Set(this.attempts.map((attempt) => attempt.examTitle)));
  }

  get totalAttempts(): number {
    return this.attempts.length;
  }

  get averageScore(): number {
    if (!this.attempts.length) return 0;
    return Math.round(this.attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / this.attempts.length);
  }

  get averagePercent(): number {
    if (!this.attempts.length) return 0;
    return Math.round(this.attempts.reduce((sum, attempt) => sum + this.scorePercent(attempt), 0) / this.attempts.length);
  }

  get bestAttempt(): AttemptResult | null {
    return this.attempts.reduce<AttemptResult | null>((best, attempt) => {
      if (!best || this.scorePercent(attempt) > this.scorePercent(best)) return attempt;
      return best;
    }, null);
  }

  get latestAttempt(): AttemptResult | null {
    return this.attempts[0] || null;
  }

  get previousAttempt(): AttemptResult | null {
    return this.attempts[1] || null;
  }

  get scoreChange(): number | null {
    if (!this.latestAttempt || !this.previousAttempt) return null;
    if (this.latestAttempt.maxScore === this.previousAttempt.maxScore) {
      return this.latestAttempt.totalScore - this.previousAttempt.totalScore;
    }
    return Math.round(this.scorePercent(this.latestAttempt) - this.scorePercent(this.previousAttempt));
  }

  get scoreChangeLabel(): string {
    if (this.scoreChange === null) return '';
    const unit = this.latestAttempt?.maxScore === this.previousAttempt?.maxScore ? ' points' : ' percentage points';
    if (this.scoreChange > 0) return `↑ ${this.scoreChange}${unit} from your previous attempt`;
    if (this.scoreChange < 0) return `↓ ${Math.abs(this.scoreChange)}${unit} from your previous attempt`;
    return 'Same score as your previous attempt';
  }

  scorePercent(attempt: AttemptResult): number {
    return attempt.maxScore > 0 ? (attempt.totalScore / attempt.maxScore) * 100 : 0;
  }

  scoreLabel(attempt: AttemptResult): string {
    return `${attempt.totalScore} / ${attempt.maxScore}`;
  }

  formattedDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  scoreClass(attempt: AttemptResult): string {
    const percent = this.scorePercent(attempt);
    if (percent >= 70) return 'score-high';
    if (percent >= 40) return 'score-mid';
    return 'score-low';
  }

  viewAnalysis(attempt: AttemptResult): void {
    if (attempt.attemptId) {
      this.router.navigate(['/analysis', attempt.attemptId]);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToPrepare(): void {
    this.router.navigate(['/prepare']);
  }

  onExamFilterChange(): void {
    this.updateChart();
  }

  private updateChart(): void {
    const chartAttempts = (this.selectedExamTitle === 'ALL'
      ? [...this.attempts]
      : this.attempts.filter((attempt) => attempt.examTitle === this.selectedExamTitle))
      .sort((a, b) => this.timestamp(a.submittedAt) - this.timestamp(b.submittedAt))
      .slice(-10);
    this.chartData.labels = chartAttempts.map((attempt, index) => {
      const date = new Date(attempt.submittedAt);
      const day = Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return day ? `${index + 1} · ${day}` : `Attempt ${index + 1}`;
    });
    this.chartData.datasets[0].data = chartAttempts.map((attempt) => Math.round(this.scorePercent(attempt)));
    this.chart?.update();
  }

  private timestamp(value: string): number {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
