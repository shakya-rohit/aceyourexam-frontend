import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Topic {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
  topics?: Topic[];
}

@Injectable({
  providedIn: 'root'
})
export class SubjectService {

  private baseUrl = environment.apiBaseUrl;

  // cache
  private subjectsCache: Subject[] | null = null;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
          const token = localStorage.getItem('AYE_TOKEN');
          return new HttpHeaders({
              Authorization: `Bearer ${token}`
          });
      }

  getSubjects(includeTopics: boolean): Observable<Subject[]> {
    // cache only when topics are included (most useful case)
    if (includeTopics && this.subjectsCache) {
      return of(this.subjectsCache);
    }

    return this.http
      .get<Subject[]>(`${this.baseUrl}/subjects?includeTopics=${includeTopics}`, {
            headers: this.getAuthHeaders()
        })
      .pipe(
        tap(res => {
          if (includeTopics) {
            this.subjectsCache = res;
          }
        })
      );
  }

  clearCache() {
    this.subjectsCache = null;
  }
}
