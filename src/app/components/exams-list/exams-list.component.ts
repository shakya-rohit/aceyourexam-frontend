import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/* Angular Material */
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-exams-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './exams-list.component.html',
  styleUrls: ['./exams-list.component.scss']
})
export class ExamsListComponent implements OnInit {

  displayedColumns = ['examType', 'title', 'duration', 'questions', 'status', 'actions'];
  exams: any[] = [];
  loading = true;

  constructor(
    private service: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadExams();
  }

  loadExams() {
    this.loading = true;
    this.service.getExams().subscribe({
      next: (data) => {
        this.exams = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  createExam() {
    this.router.navigate(['/create-exam']);
  }

  editExam(examId: string) {
    this.router.navigate(['/create-exam', examId, 'edit']);
  }

  deleteExam(examId: string) {
    this.loading=true;
    this.service.deleteExam(examId).subscribe({
      next: (data) => {
        console.log(`Exam deleted with id ${data.id}`);
        this.exams = this.exams.filter(exam => exam.id !== examId);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
