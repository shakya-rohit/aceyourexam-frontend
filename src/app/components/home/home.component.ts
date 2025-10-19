import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) { }

  goToLogin() {
    console.log('Button clicked');
    const user = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_LOGGED_IN');

    if (user && token) {
      console.log('Already logged in → Dashboard');
      this.router.navigate(['/dashboard']);
    } else {
      console.log('Not logged in → Auth');
      this.router.navigate(['/auth']);
    }
  }
}