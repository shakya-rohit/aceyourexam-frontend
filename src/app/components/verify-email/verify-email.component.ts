import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-verify-email',
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
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {

  loading = true;
  success = false;
  errorMessage = '';
  expired = false;
  resendSuccess = false;
  token!: string;
  resendLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading = false;
      this.errorMessage = 'Invalid verification link.';
      return;
    }

    this.token = token;
    this.verifyEmail(token);
  }

  verifyEmail(token: string) {
    this.apiService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.loading = false;

        if (err.status === 410) {
          // expired token
          this.expired = true;
        } else {
          this.errorMessage =
            err?.error?.message || 'Verification link is invalid.';
        }
      }
    });
  }

  resendVerification() {
    this.resendLoading = true;

    this.apiService.resendVerificationEmail(this.token).subscribe({
      next: () => {
        this.resendLoading = false;
        this.resendSuccess = true;
      },
      error: () => {
        this.resendLoading = false;
        this.errorMessage = 'Unable to resend verification email.';
      }
    });
  }
}
