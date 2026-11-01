import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

interface Insight {
  type: 'positive' | 'warning' | 'negative';
  message: string;
}

type QuestionStatus = 'all' | 'incorrect' | 'skipped' | 'correct';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, BaseChartDirective],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {
  attemptId!: number;
  attemptData: any;
  pieChartData!: ChartConfiguration<'doughnut'>['data'];
  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: { legend: { display: false } }
  };

  insights: Insight[] = [];
  aiAnalysis: any = null;
  aiLoading = false;

  searchTerm = '';
  selectedSubject = 'all';
  selectedStatus: QuestionStatus = 'all';
  currentPage = 1;
  readonly pageSize = 10;

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.attemptId = +this.route.snapshot.paramMap.get('attemptId')!;
    this.loadAttemptDetails();
  }

  loadAttemptDetails(): void {
    this.api.getAttemptById(this.attemptId).subscribe({
      next: (res) => {
        const questions = res.questions || [];
        const correctCount = questions.filter((q: any) => q.isCorrect).length;
        const skippedCount = this.calculateSkipped(res);
        const wrongCount = questions.length - correctCount - skippedCount;

        this.attemptData = {
          ...res,
          questions,
          totalQuestions: questions.length,
          correctCount: res.correctCount ?? correctCount,
          wrongCount: res.wrongCount ?? wrongCount,
          skippedCount,
          accuracy: questions.length ? (correctCount / questions.length) * 100 : 0
        };
        this.insights = res.insights || [];
        this.prepareChart(this.attemptData);
      },
      error: (err) => console.error('Error loading attempt', err)
    });
  }

  calculateSkipped(res: any): number {
    return (res.questions || []).filter((q: any) =>
      q.selectedOptionIndex === null || q.selectedOptionIndex === undefined
    ).length;
  }

  private prepareChart(data: any): void {
    this.pieChartData = {
      labels: ['Correct', 'Incorrect', 'Skipped'],
      datasets: [{
        data: [data.correctCount, data.wrongCount, data.skippedCount],
        backgroundColor: ['#26a269', '#e54855', '#aab1bf'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }

  get subjects(): string[] {
    return [...new Set((this.attemptData?.questions || [])
      .map((question: any) => question.subject || 'General'))] as string[];
  }

  get subjectStats(): Array<{ name: string; total: number; correct: number; accuracy: number }> {
    return this.subjects.map((name) => {
      const questions = (this.attemptData?.questions || []).filter(
        (question: any) => (question.subject || 'General') === name
      );
      const correct = questions.filter((question: any) => question.isCorrect).length;
      return {
        name,
        total: questions.length,
        correct,
        accuracy: questions.length ? Math.round((correct / questions.length) * 100) : 0
      };
    });
  }

  get lowestSubjects(): string[] {
    if (!this.subjectStats.length) return [];
    const lowest = Math.min(...this.subjectStats.map((subject) => subject.accuracy));
    return this.subjectStats.filter((subject) => subject.accuracy === lowest).map((subject) => subject.name);
  }

  get statusCounts(): Record<QuestionStatus, number> {
    const questions = this.attemptData?.questions || [];
    const skipped = questions.filter((q: any) => this.isSkipped(q)).length;
    const correct = questions.filter((q: any) => !this.isSkipped(q) && q.isCorrect).length;
    const incorrect = questions.filter((q: any) => !this.isSkipped(q) && !q.isCorrect).length;
    return { all: questions.length, correct, incorrect, skipped };
  }

  get filteredQuestions(): any[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return (this.attemptData?.questions || []).filter((question: any) => {
      const subject = question.subject || 'General';
      const matchesSubject = this.selectedSubject === 'all' || subject === this.selectedSubject;
      const matchesStatus = this.selectedStatus === 'all' ||
        (this.selectedStatus === 'skipped' && this.isSkipped(question)) ||
        (this.selectedStatus === 'correct' && !this.isSkipped(question) && question.isCorrect) ||
        (this.selectedStatus === 'incorrect' && !this.isSkipped(question) && !question.isCorrect);
      const matchesSearch = !term || (question.questionText || '').toLocaleLowerCase().includes(term);
      return matchesSubject && matchesStatus && matchesSearch;
    });
  }

  get pagedQuestions(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredQuestions.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredQuestions.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredQuestions.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredQuestions.length);
  }

  setStatus(status: QuestionStatus): void {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  resetPage(): void {
    this.currentPage = 1;
  }

  changePage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  isSkipped(question: any): boolean {
    return question.selectedOptionIndex === null || question.selectedOptionIndex === undefined;
  }

  questionNumber(question: any): number {
    return (this.attemptData?.questions || []).indexOf(question) + 1;
  }

  optionLabel(question: any, index: number | null | undefined): string {
    if (index === null || index === undefined) return 'Not answered';
    const rawOptions = question.options;
    const options = Array.isArray(rawOptions)
      ? rawOptions
      : typeof rawOptions === 'string' && rawOptions.includes('||')
        ? rawOptions.split('||')
        : typeof rawOptions === 'string'
          ? rawOptions.split(',')
          : [];
    const label = String.fromCharCode(65 + index);
    const text = options[index]?.trim();
    return text ? `${label}. ${text}` : `Option ${label}`;
  }

  backToResults(): void {
    this.router.navigate(['/results']);
  }

  generateAIAnalysis(): void {
    this.aiLoading = true;
    this.aiAnalysis = null;
    this.api.generateAIAnalysis(this.attemptId).subscribe({
      next: (res) => {
        this.aiAnalysis = res;
        this.aiLoading = false;
      },
      error: (err) => {
        console.error('AI analysis error', err);
        this.aiLoading = false;
      }
    });
  }
}
