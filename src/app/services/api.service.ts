import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ---------- AUTH ----------
  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  // ---------- EXAMS ----------
  getExams(): Observable<any> {
    return this.http.get(`${this.baseUrl}/exams`);
  }

  // ---------- RESULTS ----------
  getResults(userEmail: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/results?email=${userEmail}`);
  }

  submitResult(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/results`, payload);
  }
}