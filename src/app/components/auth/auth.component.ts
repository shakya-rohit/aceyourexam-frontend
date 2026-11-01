// auth.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { MatTabChangeEvent } from '@angular/material/tabs';

import { ApiService } from '../../services/api.service';

declare var google: any;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit {
  // login form fields
  loginEmail = '';
  loginPassword = '';

  // register form
  regName = '';
  regEmail = '';
  regPassword = '';

  selectedTab = 0;
  loginLoading = false;
  registerLoading = false;
  showLoginPassword = false;
  showRegisterPassword = false;
  loginError = '';
  loginSuccess = '';
  registerError = '';

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    if (typeof google === 'undefined' || !google.accounts?.id) return;
    google.accounts.id.initialize({
      client_id: '88467193803-7fdu7pmu26iqo0qflg1a95fhcnaf3v4n.apps.googleusercontent.com',
      callback: (resp: any) => {
        this.api.googleLogin({ idToken: resp.credential }).subscribe({
          next: (res) => {
            localStorage.setItem('AYE_TOKEN', res.token);
            localStorage.setItem('AYE_USER', JSON.stringify(res));
            this.api.setLoginStatus(true);

            if (res.examTypeId === null || res.examTypeId === undefined) {
              this.router.navigate(['/complete-profile']);
              return;
            }

            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('Login failed', err);
            this.loginError = this.authErrorMessage(err, 'login');
          },
        });
      },
    });

    // initial render
    this.renderGoogleButton();
  }

  onTabChange(event: MatTabChangeEvent) {
    this.selectedTab = event.index;
    this.loginError = '';
    this.registerError = '';
    if (event.index === 0) {
      this.renderGoogleButton();
    } else {
      this.loginSuccess = '';
    }
  }

  renderGoogleButton() {
    setTimeout(() => {
      const btn = document.getElementById('googleBtn');

      if (!btn || typeof google === 'undefined' || !google.accounts?.id) return;

      // 🔥 IMPORTANT: clear previous render
      btn.innerHTML = '';

      google.accounts.id.renderButton(btn, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'rectangle',
      });
    }, 0);
  }

  // Normal login using backend email/password
  login() {
    if (this.loginLoading) return;
    this.loginError = '';
    this.loginSuccess = '';
    this.loginLoading = true;
    const payload = { email: this.loginEmail, password: this.loginPassword };
    this.api.login(payload).subscribe({
      next: (res) => {
        this.loginLoading = false;
        localStorage.setItem('AYE_TOKEN', res.token);
        localStorage.setItem('AYE_USER', JSON.stringify(res));
        this.api.setLoginStatus(true);

        if (res.examTypeId === null || res.examTypeId === undefined) {
          this.router.navigate(['/complete-profile']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
        this.loginError = this.authErrorMessage(err, 'login');
        this.loginLoading = false;
      },
    });
  }

  // Normal register
  register() {
    if (this.registerLoading) return;
    this.registerError = '';
    this.registerLoading = true;
    const payload = {
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      role: 'STUDENT',
    };
    this.api.register(payload).subscribe({
      next: () => {
        this.registerLoading = false;
        this.loginEmail = this.regEmail;
        this.loginPassword = '';
        this.loginSuccess = 'Account created. Check your email and verify your address before signing in.';
        this.regName = '';
        this.regEmail = '';
        this.regPassword = '';
        this.selectedTab = 0;
        this.renderGoogleButton();
      },
      error: (err) => {
        console.error('Registration failed', err);
        this.registerError = this.authErrorMessage(err, 'register');
        this.registerLoading = false;
      },
    });
  }

  private authErrorMessage(err: any, action: 'login' | 'register'): string {
    if (err?.status === 0) return 'Unable to reach the server. Check your connection and try again.';
    if (action === 'login') return 'We couldn’t sign you in with those details. Check your email and password.';
    if (err?.status === 409) return 'An account with this email already exists. Try signing in instead.';
    return err?.error?.message || 'We couldn’t create your account. Please try again.';
  }
}
