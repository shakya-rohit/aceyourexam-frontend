import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { HttpClient } from '@angular/common/http';
import { ExamTypesService } from '../../services/exam-types.service';
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
  styleUrls: ['./complete-profile.component.scss']
})
export class CompleteProfileComponent implements OnInit {

  examTypes: any[] = [];
  selectedExamTypeId!: number;

  isLoading = false;
  isSaving = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private service: ExamTypesService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.fetchExamTypes();
  }

  fetchExamTypes() {
    this.isLoading = true;

    this.service.fetchExamTypes()
      .subscribe({
        next: (res) => {
          this.examTypes = res;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  saveProfile() {
    if (!this.selectedExamTypeId) return;

    this.isSaving = true;

    this.apiService.completeProfile({
      examTypeId: this.selectedExamTypeId
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }
}