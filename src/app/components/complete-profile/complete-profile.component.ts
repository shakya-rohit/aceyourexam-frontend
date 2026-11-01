import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ExamType, ExamTypesService } from '../../services/exam-types.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatRadioModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {

  examTypes: ExamType[] = [];
  selectedExamTypeId!: number;

  isLoading = false;
  isSaving = false;
  loadError = '';
  saveError = '';

  constructor(
    private router: Router,
    private service: ExamTypesService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.fetchExamTypes();
  }

  fetchExamTypes() {
    this.isLoading = true;
    this.loadError = '';
    this.saveError = '';

    this.service.fetchExamTypes()
      .subscribe({
        next: (res) => {
          this.examTypes = Array.isArray(res) ? res : [];
          this.isLoading = false;
          if (!this.examTypes.length) {
            this.loadError = 'No exam options are available right now. Please try again shortly.';
          }
        },
        error: () => {
          this.isLoading = false;
          this.loadError = 'We couldn’t load the exam options. Check your connection and try again.';
        }
      });
  }

  examIcon(exam: ExamType): string {
    const name = exam.name.toLocaleUpperCase();
    if (name.includes('NEET')) return '🩺';
    if (name.includes('JEE')) return '⚙️';
    if (name.includes('UPSC')) return '🏛️';
    return '📘';
  }

  examSubjects(exam: ExamType): string {
    const name = exam.name.toLocaleUpperCase();
    if (name.includes('NEET')) return 'Physics · Chemistry · Biology';
    if (name.includes('JEE')) return 'Physics · Chemistry · Mathematics';
    if (name.includes('UPSC')) return 'General Studies · CSAT';
    return exam.description || 'Choose this exam to personalize your study experience.';
  }

  saveProfile() {
    if (!this.selectedExamTypeId) return;

    this.isSaving = true;
    this.saveError = '';

    this.apiService.completeProfile({
      examTypeId: this.selectedExamTypeId
    }).subscribe({
      next: () => {
        this.isSaving = false;
        try {
          const currentUser = JSON.parse(localStorage.getItem('AYE_USER') || '{}');
          localStorage.setItem('AYE_USER', JSON.stringify({
            ...currentUser,
            examTypeId: this.selectedExamTypeId
          }));
        } catch {
          // The backend profile is saved; a missing local cache can be refreshed on next sign-in.
        }
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = 'We couldn’t save your selection. Please try again.';
      }
    });
  }
}
