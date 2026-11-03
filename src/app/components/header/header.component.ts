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
    this.refreshUserState();

    this.api.loginStatus$.subscribe(status => {
      this.refreshUserState(status);
    });
  }

  private refreshUserState(loggedIn = !!localStorage.getItem('AYE_TOKEN')): void {
    this.isLoggedIn = loggedIn;
    if (!loggedIn) {
      this.userName = '';
      this.userRole = 'STUDENT';
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('AYE_USER') || '{}');
      this.userName = user.name || 'User';
      this.userRole = String(user.role || 'STUDENT').toUpperCase();
    } catch {
      this.userName = 'User';
      this.userRole = 'STUDENT';
    }
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/']);
  }
}
