import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = environment.aiBaseUrl;

  constructor(private http: HttpClient) {}

  askAI(question: string, messages: any[]): Observable<any> {
    const userData = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_TOKEN');

    if (!userData || !token) {
      return throwError(() => new Error('User not authenticated'));
    }

    let user: any;
    try {
      user = JSON.parse(userData);
    } catch {
      return throwError(() => new Error('User session is invalid'));
    }
    if (!user?.id) {
      return throwError(() => new Error('User session is invalid'));
    }

    return this.http.post(
      `${this.baseUrl}/ask`,
      {
        question: question,
        messages: messages,
        userId: user.id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }
}
