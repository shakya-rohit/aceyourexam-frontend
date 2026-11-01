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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatTooltipModule
  ],
  templateUrl: './exams-list.component.html',
  styleUrls: ['./exams-list.component.scss']
})
export class ExamsListComponent implements OnInit {

  displayedColumns = ['examType', 'title', 'duration', 'questions', 'status', 'actions'];
  exams: any[] = [];
  loading = true;
  errorMessage = '';
  searchText = '';
  selectedExamType = '';
  selectedStatus = '';
  pageIndex = 0;
  pageSize = 10;

  get examTypes(): string[] {
    return [...new Set(this.exams.map(exam => exam.examType).filter(Boolean))].sort();
  }

  get statuses(): string[] {
    return [...new Set(this.exams.map(exam => String(exam.status || 'DRAFT').toUpperCase()))].sort();
  }

  get filteredExams(): any[] {
    const query = this.searchText.trim().toLocaleLowerCase();
    return this.exams.filter(exam => {
      const titleMatches = !query || String(exam.title || '').toLocaleLowerCase().includes(query);
      const typeMatches = !this.selectedExamType || exam.examType === this.selectedExamType;
      const statusMatches = !this.selectedStatus
        || String(exam.status || 'DRAFT').toUpperCase() === this.selectedStatus;
      return titleMatches && typeMatches && statusMatches;
    });
  }

  get pagedExams(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredExams.slice(start, start + this.pageSize);
  }

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
        this.exams = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load exams. Please try again.';
      }
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  createExam() {
    this.router.navigate(['/create-exam']);
  }

  editExam(examId: string) {
    this.router.navigate(['/create-exam', examId, 'edit']);
  }

  deleteExam(examId: number | string) {
    this.loading=true;
    this.service.deleteExam(examId).subscribe({
      next: () => {
        this.exams = this.exams.filter(exam => String(exam.id) !== String(examId));
        if (this.pageIndex * this.pageSize >= this.filteredExams.length && this.pageIndex > 0) this.pageIndex--;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not delete the exam. Please try again.';
      }
    });
  }
}
