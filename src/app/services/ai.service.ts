import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private BASE_URL = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  askAI(question: string, messages: any[]): Observable<any> {
    const userData = localStorage.getItem('AYE_USER');
    const token = localStorage.getItem('AYE_TOKEN');

    if (!userData || !token) {
      throw new Error('User not authenticated');
    }

    const user = JSON.parse(userData);

    return this.http.post(
      `${this.BASE_URL}/ask`,
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
