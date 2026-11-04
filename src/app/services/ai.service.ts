import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/ai`;

  constructor(private http: HttpClient) {}

  askAI(question: string, messages: any[]): Observable<any> {
    const token = localStorage.getItem('AYE_TOKEN');

    if (!token) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post(
      `${this.baseUrl}/ask`,
      {
        question,
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }
}
