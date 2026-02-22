import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamType {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExamTypesService {

  private baseUrl = environment.apiBaseUrl;

  // cache
  private examTypesCache: ExamType[] | null = null;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
          const token = localStorage.getItem('AYE_TOKEN');
          return new HttpHeaders({
              Authorization: `Bearer ${token}`
          });
      }

  fetchExamTypes(): Observable<ExamType[]> {
    // cache only when topics are included (most useful case)
    if (this.examTypesCache) {
      return of(this.examTypesCache);
    }

    return this.http.get<ExamType[]>(`${this.baseUrl}/exam-types`, {
            headers: this.getAuthHeaders()
        })
      .pipe(
        tap(res => {
            this.examTypesCache = res;
        })
      );
  }

  clearCache() {
    this.examTypesCache = null;
  }
}
