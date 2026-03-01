import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

interface Insight {
  type: 'positive' | 'warning' | 'negative';
  message: string;
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, BaseChartDirective],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {
  attemptId!: number;
  attemptData: any;
  pieChartData!: ChartConfiguration<'doughnut'>['data'];
  barChartData!: ChartConfiguration<'bar'>['data'];

  insights: Insight[] = [];

  aiAnalysis: any = null;
  aiLoading = false;

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.attemptId = +this.route.snapshot.paramMap.get('attemptId')!;
    this.loadAttemptDetails();
  }

  loadAttemptDetails() {
    this.api.getAttemptById(this.attemptId).subscribe({
      next: (res) => {
        this.attemptData = {
          ...res,
          totalQuestions: res.questions?.length || 0,
          skippedCount: this.calculateSkipped(res),
          accuracy: res.accuracy || this.calculateAccuracy(res)
        };
        this.prepareCharts(this.attemptData);
        this.insights = res.insights;
        // this.generateInsights(this.attemptData);
      },
      error: (err) => console.error('Error loading attempt', err)
    });
  }

  calculateSkipped(res: any): number {
    const answered = (res.questions || []).filter((q: any) => q.selectedOptionIndex !== null && q.selectedOptionIndex !== undefined).length;
    return (res.questions?.length || 0) - answered;
  }

  calculateAccuracy(res: any): number {
    if (!res.questions?.length) return 0;
    const correct = (res.questions || []).filter((q: any) => q.isCorrect).length;
    return (correct / res.questions.length) * 100;
  }

  prepareCharts(data: any) {
    // 🍩 Overall Accuracy (same as before)
    this.pieChartData = {
      labels: ['Correct', 'Incorrect', 'Skipped'],
      datasets: [
        {
          data: [data.correctCount, data.wrongCount, data.skippedCount],
          backgroundColor: ['#4CAF50', '#E53935', '#9E9E9E']
        }
      ]
    };

    // 📘 Subject-wise performance (computed dynamically)
    const subjectStats: { [key: string]: { correct: number; total: number } } = {};

    (data.questions || []).forEach((q: any) => {
      const subject = q.subject || 'General'; // fallback if subject missing
      if (!subjectStats[subject]) subjectStats[subject] = { correct: 0, total: 0 };
      subjectStats[subject].total++;
      if (q.isCorrect) subjectStats[subject].correct++;
    });

    const subjects = Object.keys(subjectStats);
    const correctCounts = subjects.map((s) => subjectStats[s].correct);
    const accuracies = subjects.map((s) =>
      Math.round((subjectStats[s].correct / subjectStats[s].total) * 100)
    );

    this.barChartData = {
      labels: subjects,
      datasets: [
        {
          label: 'Correct Answers',
          data: correctCounts,
          backgroundColor: '#3F51B5'
        },
        {
          label: 'Accuracy (%)',
          data: accuracies,
          backgroundColor: '#FFC107'
        }
      ]
    };
  }

  backToResults() {
    this.router.navigate(['/results']);
  }

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count / Accuracy (%)',
        },
      },
    },
  };

  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
  };

  generateAIAnalysis() {
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
