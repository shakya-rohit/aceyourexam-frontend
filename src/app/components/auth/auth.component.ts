// auth.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    MatButtonModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  // login form fields
  loginEmail = '';
  loginPassword = '';

  // register form
  regName = '';
  regEmail = '';
  regPassword = '';

  constructor(
    private api: ApiService,
    private router: Router
  ) { }



  ngOnInit() {
    google.accounts.id.initialize({
      client_id: '88467193803-7fdu7pmu26iqo0qflg1a95fhcnaf3v4n.apps.googleusercontent.com',
      callback: (resp: any) => {
        console.log(resp);
        this.api.googleLogin({ idToken: resp.credential }).subscribe({
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
    });

    // initial render
    this.renderGoogleButton();
  }

  onTabChange(event: MatTabChangeEvent) {
    if (event.index === 0) {
      this.renderGoogleButton();
    }
  }

  renderGoogleButton() {
    setTimeout(() => {
      const btn = document.getElementById('googleBtn');

      if (!btn) return;

      // 🔥 IMPORTANT: clear previous render
      btn.innerHTML = '';

      google.accounts.id.renderButton(btn, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'rectangle'
      });
    }, 0);
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

}
