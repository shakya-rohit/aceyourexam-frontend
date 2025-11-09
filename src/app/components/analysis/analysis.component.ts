import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../services/api.service';

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

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.attemptId = +this.route.snapshot.paramMap.get('attemptId')!;
    this.loadAttemptDetails();
  }

  loadAttemptDetails() {
    this.api.getAttemptById(this.attemptId).subscribe({
      next: (res) => {
        this.attemptData = res;
        this.prepareCharts(res);
      },
      error: (err) => console.error('Error loading attempt', err)
    });
  }

  prepareCharts(data: any) {
    // Pie chart: correct vs incorrect vs skipped
    this.pieChartData = {
      labels: ['Correct', 'Incorrect', 'Skipped'],
      datasets: [
        {
          data: [data.correctCount, data.wrongCount, data.skippedCount],
          backgroundColor: ['#4CAF50', '#E53935', '#9E9E9E']
        }
      ]
    };

    // Bar chart: section-wise performance
    this.barChartData = {
      labels: ['Physics', 'Chemistry', 'Biology'],
      datasets: [
        {
          label: 'Score by Subject',
          data: [data.physicsScore, data.chemistryScore, data.biologyScore],
          backgroundColor: ['#3F51B5', '#00BCD4', '#8BC34A']
        }
      ]
    };
  }

  backToResults() {
    this.router.navigate(['/results']);
  }
}
