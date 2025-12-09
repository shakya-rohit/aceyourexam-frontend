// auth.component.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';

import {
  SocialAuthService,
  SocialUser,
  GoogleLoginProvider,
  SocialLoginModule
} from '@abacritt/angularx-social-login';

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
    MatButtonModule,
    SocialLoginModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AuthComponent implements OnInit {
  // login form fields
  loginEmail = '';
  loginPassword = '';

  // register form
  regName = '';
  regEmail = '';
  regPassword = '';

  googleUser?: SocialUser | null = null;
  gsiAvailable = false; // whether GSI widget can be rendered
  gsiWidgetRendered = false; // helper if you want to detect widget rendering

  constructor(
    private api: ApiService,
    private router: Router,
    private authService: SocialAuthService
  ) { }

  ngOnInit(): void {
    // 1) subscribe to social auth state (fires when sign-in finishes)
    this.authService.authState.subscribe((user: SocialUser | null) => {
      this.googleUser = user;
      if (user) {
        // send idToken to backend for verification and JWT minting
        // you already had api.googleLogin — keep that endpoint
        this.api.googleLogin({ idToken: user.idToken }).subscribe({
          next: (res) => {
            localStorage.setItem('AYE_TOKEN', res.token);
            localStorage.setItem('AYE_USER', JSON.stringify(res));
            this.api.setLoginStatus(true);
            alert('Logged in with Google successfully!');
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('Google login failed (backend)', err);
            alert('Google login failed. Try again.');
          }
        });
      }
    });

    // 2) check if GSI SDK is available (simple check)
    // NOTE: the SDK adds `window.google.accounts.id` when loaded successfully
    setTimeout(() => {
      const win = window as any;
      this.gsiAvailable = !!(win && win.google && win.google.accounts && win.google.accounts.id);

      // ✅ Force fallback for localhost or when FedCM is blocked
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        this.gsiAvailable = false;
      }

      console.log('GSI available?', this.gsiAvailable);
    }, 800);

  }

  // Normal login using backend email/password
  login() {
    const payload = { email: this.loginEmail, password: this.loginPassword };
    this.api.login(payload).subscribe({
      next: (res) => {
        localStorage.setItem('AYE_TOKEN', res.token);
        localStorage.setItem('AYE_USER', JSON.stringify(res));
        this.api.setLoginStatus(true);
        // alert('Login successful!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
        alert('Invalid credentials. Please try again.');
      }
    });
  }

  // Normal register
  register() {
    const payload = {
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      role: 'STUDENT'
    };
    this.api.register(payload).subscribe({
      next: () => {
        alert('Registration successful! Please login.');
        this.regName = '';
        this.regEmail = '';
        this.regPassword = '';
      },
      error: (err) => {
        console.error('Registration failed', err);
        alert('Registration failed. Try again.');
      }
    });
  }

  // Programmatic fallback: call this when the GSI widget did not render,
  // or you want a Material-style button that opens the popup.
  signInWithGoogleProgrammatic() {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID)
      .then((user) => {
        if (user && user.idToken) {
          this.api.googleLogin(user.idToken).subscribe({
            next: (res) => {
              localStorage.setItem('AYE_TOKEN', res.token);
              this.api.setLoginStatus(true);
              this.router.navigate(['/dashboard']);
            },
            error: (err) => console.error('Backend verification failed', err)
          });
        }
      })
      .catch(err => {
        console.error('Programmatic Google sign-in failed:', err);
      });
  }

}
