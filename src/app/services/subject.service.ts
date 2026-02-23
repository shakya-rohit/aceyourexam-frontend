import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

  getSubjects(includeTopics: boolean, examTypeId?: number): Observable<Subject[]> {
    // cache only when topics are included (most useful case)
    if (includeTopics && this.subjectsCache) {
      return of(this.subjectsCache);
    }

    let params = new HttpParams().set('includeTopics', includeTopics);
    if (examTypeId) {
      params = params.set('examTypeId', examTypeId);
    }

    return this.http
      .get<Subject[]>(`${this.baseUrl}/subjects`, {
            headers: this.getAuthHeaders(),
            params: params
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
