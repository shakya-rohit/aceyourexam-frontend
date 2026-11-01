import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

interface DashboardAttempt {
  id: number;
  examId: number;
  examTitle: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  submittedAt: string;
  subjects: Record<string, number>;
}

interface SubjectPerformance {
  name: string;
  correct: number;
  total: number;
  accuracy: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  user: any = null;
  exams: any[] = [];
  publishedExams: any[] = [];
  availableExams: any[] = [];
  results: DashboardAttempt[] = [];
  recentAttempts: DashboardAttempt[] = [];
  subjectPerformance: SubjectPerformance[] = [];

  loadingExams = true;
  loadingResults = true;
  loadingSubjects = false;
  examLoadError = false;
  resultLoadError = false;

  totalExams = 0;
  averageScore = 0;
  averageScorePercent = 0;
  bestScore = 0;
  bestScoreMax = 720;

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
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
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

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_TOKEN');

    if (!userData || !token) {
      this.router.navigate(['/auth']);
      return;
    }

    try {
      this.user = JSON.parse(userData);
    } catch {
      localStorage.removeItem('AYE_USER');
      this.router.navigate(['/auth']);
      return;
    }

    this.fetchExams();
    this.fetchResults();
  }

  fetchExams(): void {
    this.loadingExams = true;
    this.api.getExams().subscribe({
      next: (response) => {
        this.exams = Array.isArray(response) ? response : [];
        this.updateAvailableExams();
        if (this.results.length) {
          this.calculateStats();
          this.updateChart();
        }
        this.loadingExams = false;
      },
      error: () => {
        this.examLoadError = true;
        this.loadingExams = false;
      },
    });
  }

  fetchResults(): void {
    const studentId = Number(this.user?.id);
    if (!studentId) {
      this.resultLoadError = true;
      this.loadingResults = false;
      return;
    }

    this.loadingResults = true;
    this.api.getResultsByStudent(studentId).subscribe({
      next: (response) => {
        const attempts = Array.isArray(response) ? response : [];
        this.results = attempts
          .map((result: any) => ({
            id: Number(result.id),
            examId: Number(result.examId),
            examTitle: result.examTitle || 'Untitled exam',
            totalScore: Number(result.totalScore) || 0,
            correctCount: Number(result.correctCount) || 0,
            wrongCount: Number(result.wrongCount) || 0,
            accuracy: Number(result.accuracy) || 0,
            submittedAt: result.submittedAt,
            subjects: result.subjects || {},
          }))
          .sort((a, b) => this.timestamp(b.submittedAt) - this.timestamp(a.submittedAt));

        this.totalExams = this.results.length;
        this.recentAttempts = this.results.slice(0, 3);
        this.calculateStats();
        this.updateChart();
        this.updateAvailableExams();
        this.loadingResults = false;

        if (this.results.length > 0 && this.results[0].id) {
          this.fetchLatestSubjectPerformance(this.results[0].id);
        }
      },
      error: () => {
        this.resultLoadError = true;
        this.loadingResults = false;
      },
    });
  }

  private calculateStats(): void {
    if (!this.results.length) {
      this.averageScore = 0;
      this.averageScorePercent = 0;
      this.bestScore = 0;
      this.bestScoreMax = 720;
      return;
    }

    const percentages = this.results.map((attempt) => this.scorePercent(attempt));
    this.averageScorePercent = Math.round(
      percentages.reduce((sum, value) => sum + value, 0) / percentages.length,
    );
    this.averageScore = Math.round(
      this.results.reduce((sum, attempt) => sum + attempt.totalScore, 0) / this.results.length,
    );

    const bestAttempt = this.results.reduce((best, attempt) =>
      this.scorePercent(attempt) > this.scorePercent(best) ? attempt : best,
    );
    this.bestScore = bestAttempt.totalScore;
    this.bestScoreMax = this.maxScoreFor(bestAttempt);
  }

  private updateChart(): void {
    const chronologicalAttempts = this.results.slice(0, 8).reverse();
    this.chartData.labels = chronologicalAttempts.map((attempt, index) => {
      const date = new Date(attempt.submittedAt);
      const day = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return day ? `${index + 1} · ${day}` : `Attempt ${index + 1}`;
    });
    this.chartData.datasets[0].data = chronologicalAttempts.map((attempt) => Math.round(this.scorePercent(attempt)));
    this.chart?.update();
  }

  private fetchLatestSubjectPerformance(attemptId: number): void {
    this.loadingSubjects = true;
    this.api.getAttemptById(attemptId).subscribe({
      next: (attempt) => {
        const totals = new Map<string, { correct: number; total: number }>();
        (attempt?.questions || []).forEach((question: any) => {
          const name = question.subject || 'Other';
          const current = totals.get(name) || { correct: 0, total: 0 };
          current.total += 1;
          if (question.isCorrect === true) current.correct += 1;
          totals.set(name, current);
        });

        this.subjectPerformance = Array.from(totals.entries())
          .map(([name, values]) => ({
            name,
            correct: values.correct,
            total: values.total,
            accuracy: values.total ? Math.round((values.correct / values.total) * 100) : 0,
          }))
          .sort((a, b) => a.accuracy - b.accuracy);
        this.loadingSubjects = false;
      },
      error: () => {
        this.subjectPerformance = [];
        this.loadingSubjects = false;
      },
    });
  }

  private updateAvailableExams(): void {
    const attemptedExamIds = new Set(this.results.map((attempt) => attempt.examId));
    this.publishedExams = this.exams.filter((exam) => {
      const status = String(exam.status || '').toUpperCase();
      if (status !== 'PUBLISH') return false;

      const now = Date.now();
      const startsAt = exam.startTime ? new Date(exam.startTime).getTime() : null;
      const endsAt = exam.endTime ? new Date(exam.endTime).getTime() : null;
      return (startsAt === null || (!Number.isNaN(startsAt) && startsAt <= now))
        && (endsAt === null || (!Number.isNaN(endsAt) && endsAt > now));
    }).sort((a, b) => Number(b.id) - Number(a.id));
    this.availableExams = this.publishedExams.filter((exam) => !attemptedExamIds.has(Number(exam.id)));
  }

  scorePercent(attempt: DashboardAttempt): number {
    const maxScore = this.maxScoreFor(attempt);
    return maxScore > 0 ? (attempt.totalScore / maxScore) * 100 : 0;
  }

  maxScoreFor(attempt: DashboardAttempt): number {
    const matchingExam = this.exams.find((exam) => Number(exam.id) === attempt.examId);
    return Number(matchingExam?.totalMarks) > 0 ? Number(matchingExam.totalMarks) : 720;
  }

  scoreLabel(attempt: DashboardAttempt): string {
    return `${attempt.totalScore} / ${this.maxScoreFor(attempt)}`;
  }

  formattedDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private timestamp(value: string): number {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  get recommendedExam(): any | null {
    return this.availableExams[0] || this.publishedExams[0] || null;
  }

  get additionalExams(): any[] {
    return this.publishedExams
      .filter((exam) => Number(exam.id) !== Number(this.recommendedExam?.id));
  }

  hasAttemptedExam(examId: number): boolean {
    return this.results.some((attempt) => attempt.examId === Number(examId));
  }

  get recommendedExamIsRetake(): boolean {
    return this.recommendedExam ? this.hasAttemptedExam(this.recommendedExam.id) : false;
  }

  get weakestSubject(): SubjectPerformance | null {
    return this.subjectPerformance[0] || null;
  }

  get recentBestTitle(): string {
    const bestAttempt = this.results.reduce<DashboardAttempt | null>((best, attempt) => {
      if (!best || this.scorePercent(attempt) > this.scorePercent(best)) return attempt;
      return best;
    }, null);
    return bestAttempt?.examTitle || 'Your highest score';
  }

  startExam(exam: any): void {
    localStorage.setItem('SELECTED_EXAM', JSON.stringify(exam));
    this.router.navigate(['/exam']);
  }

  startPractice(): void {
    this.router.navigate(['/prepare']);
  }

  openTodayPlan(): void {
    this.router.navigate(['/today-plan']);
  }

  openResults(): void {
    this.router.navigate(['/results']);
  }

  openAnalysis(attempt: DashboardAttempt): void {
    this.router.navigate(['/analysis', attempt.id]);
  }

  openLatestAnalysis(): void {
    const latest = this.results[0];
    if (latest) this.openAnalysis(latest);
  }

  openAiCoach(): void {
    this.router.navigate(['/ai-chat']);
  }
}
