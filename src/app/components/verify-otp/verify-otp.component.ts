import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.scss']
})
export class VerifyOtpComponent implements OnInit, OnDestroy {

  otpForm = this.fb.group({
    d1: ['', [Validators.required, Validators.pattern('[0-9]')]],
    d2: ['', [Validators.required, Validators.pattern('[0-9]')]],
    d3: ['', [Validators.required, Validators.pattern('[0-9]')]],
    d4: ['', [Validators.required, Validators.pattern('[0-9]')]],
    d5: ['', [Validators.required, Validators.pattern('[0-9]')]],
    d6: ['', [Validators.required, Validators.pattern('[0-9]')]]
  });

  emailMasked = 'ro****@gmail.com';

  resendTimer = 110;
  private timerRef!: number;

  constructor(
    private fb: FormBuilder,
    private authService: ApiService
  ) {}

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    clearInterval(this.timerRef);
  }

  get otp(): string {
    return Object.values(this.otpForm.value).join('');
  }

  verifyEmail(): void {
    if (this.otpForm.invalid) return;

    this.authService.verifyEmail(this.otp).subscribe({
      next: () => {
        // TODO: navigate to dashboard / login
      },
      error: () => {
        // TODO: show error snackbar
      }
    });
  }

  moveFocus(event: Event, next?: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    if (input.value && next) {
      next.focus();
    }
  }

  startTimer() {
    this.timerRef = window.setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.timerRef);
      }
    }, 1000);
  }

  resendOtp(): void {
    if (this.resendTimer > 0) return;

    this.authService.resendOtp().subscribe(() => {
      this.resendTimer = 110;
      this.startTimer();
    });
  }
}
