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

  fetchExamTypes(): Observable<ExamType[]> {
    if (this.examTypesCache) {
      return of(this.examTypesCache);
    }

    const token = localStorage.getItem('AYE_TOKEN');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http.get<ExamType[]>(`${this.baseUrl}/exam-types`, {
      headers
    })
      .pipe(
        tap(res => {
          if (Array.isArray(res) && res.length > 0) {
            this.examTypesCache = res;
          }
        })
      );
  }

  clearCache() {
    this.examTypesCache = null;
  }
}
