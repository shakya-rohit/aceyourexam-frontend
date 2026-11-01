import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface StudyPlanTask {
  id: string;
  title: string;
  description: string;
  actionType: 'TOPIC_PRACTICE' | 'MIXED_PRACTICE';
  subject?: string;
  topic?: string;
  questionCount: number;
  estimatedMinutes: number;
}

interface StudyPlanFocus {
  subject: string;
  topic: string;
  answered: number;
  correct: number;
  accuracy: number;
}

interface TodayStudyPlan {
  title: string;
  introduction: string;
  examAttempts: number;
  practiceAttempts: number;
  answeredQuestions: number;
  hasHistory: boolean;
  tasks: StudyPlanTask[];
  focusAreas: StudyPlanFocus[];
}

@Component({
  selector: 'app-today-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './today-plan.component.html',
  styleUrls: ['./today-plan.component.css'],
})
export class TodayPlanComponent implements OnInit {
  plan: TodayStudyPlan | null = null;
  loading = true;
  errorMessage = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadPlan();
  }

  loadPlan(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getTodayStudyPlan().subscribe({
      next: (plan) => {
        this.plan = plan as TodayStudyPlan;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'We couldn’t build your plan right now. Please try again.';
      },
    });
  }

  get estimatedMinutes(): number {
    return (this.plan?.tasks || []).reduce((sum, task) => sum + task.estimatedMinutes, 0);
  }

  startTask(task: StudyPlanTask): void {
    if (task.actionType === 'TOPIC_PRACTICE' && task.topic && task.subject) {
      this.router.navigate(['/prepare'], {
        queryParams: {
          topic: task.topic,
          subject: task.subject,
          questionCount: task.questionCount,
        },
      });
      return;
    }
    this.router.navigate(['/prepare']);
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
