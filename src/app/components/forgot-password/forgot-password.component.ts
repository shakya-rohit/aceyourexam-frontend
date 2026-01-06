import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  email = '';
  message = '';
  error = '';
  loading = false;

  constructor(private apiService: ApiService) {}

  submit() {
    if (!this.email || this.loading) return;

    this.loading = true;
    this.message = '';
    this.error = '';

    this.apiService.forgotPassword(this.email).subscribe({
      next: () => {
        this.message = 'If the email exists, a reset link has been sent.';
        this.loading = false;
      },
      error: () => {
        this.error = 'Something went wrong. Please try again later.';
        this.loading = false;
      }
    });
  }
}
