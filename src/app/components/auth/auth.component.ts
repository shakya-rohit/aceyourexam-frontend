import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';

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
export class AuthComponent {
  // login form
  loginEmail = '';
  loginPassword = '';

  // register form
  regName = '';
  regEmail = '';
  regPassword = '';

  constructor(private api: ApiService, private router: Router) {}

  login() {
    const payload = {
      email: this.loginEmail,
      password: this.loginPassword
    };

    this.api.login(payload).subscribe({
      next: (res) => {
        // ✅ Store token and user info
        localStorage.setItem('AYE_TOKEN', res.token);
        localStorage.setItem('AYE_USER', JSON.stringify(res));

        // ✅ Notify ApiService
        this.api.setLoginStatus(true);

        alert('Login successful!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
        alert('Invalid credentials. Please try again.');
      }
    });
  }

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