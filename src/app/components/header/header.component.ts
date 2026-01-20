import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { MatDivider } from "@angular/material/divider";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDivider
],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  userName = '';
  userRole = 'STUDENT';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.isLoggedIn = !!localStorage.getItem('AYE_TOKEN');

    if (this.isLoggedIn) {
      const userData = localStorage.getItem('AYE_USER');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          this.userName = parsed.name || 'User';
          this.userRole = parsed.role || 'STUDENT';
        } catch {
          this.userName = 'User';
          this.userRole = 'STUDENT';
        }
      }
    }

    this.api.loginStatus$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) {
        const userData = localStorage.getItem('AYE_USER');
        this.userName = userData ? JSON.parse(userData).name || 'User' : 'User';
      } else {
        this.userName = '';
      }
    });
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/']);
  }
}