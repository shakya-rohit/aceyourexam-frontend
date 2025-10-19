import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  loginEmail = '';
  loginPassword = '';
  regName = '';
  regEmail = '';
  regPassword = '';

  constructor(private router: Router) {}

  login() {
    const storedUser = localStorage.getItem('AYE_USER');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.email === this.loginEmail && user.password === this.loginPassword) {
        localStorage.setItem('AYE_LOGGED_IN', 'true');
        this.router.navigate(['/dashboard']);
        return;
      }
    }
    alert('Invalid credentials');
  }

  register() {
    if (!this.regName || !this.regEmail || !this.regPassword) {
      alert('Please fill all fields');
      return;
    }
    const user = { name: this.regName, email: this.regEmail, password: this.regPassword };
    localStorage.setItem('AYE_USER', JSON.stringify(user));
    alert('Registration successful! You can now log in.');
  }
}