import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) { }

  goToLogin() {
    const user = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_LOGGED_IN');

    if (user && token) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth']);
    }
  }
}
