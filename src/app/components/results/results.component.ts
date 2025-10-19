import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  results: any[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('AYE_RESULTS');
    this.results = stored ? JSON.parse(stored) : [];
  }

  getFeedback(score: number): string {
    if (score >= 600) return '🌟 Excellent! You’re ready for NEET!';
    if (score >= 400) return '💪 Good! Keep practicing and aim higher.';
    if (score >= 200) return '📘 Fair attempt — focus on weak topics.';
    return '🔥 Don’t give up! Revise core concepts and try again.';
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}