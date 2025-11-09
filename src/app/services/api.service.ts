import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8080/api'; // you can swap to environment.apiBaseUrl

  // ✅ Track login status across the app
  private loginStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('AYE_TOKEN'));
  loginStatus$ = this.loginStatus.asObservable();

  constructor(private http: HttpClient) { }

  // ---------- AUTH ----------
  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  // ✅ Called by components when login/logout happens
  setLoginStatus(status: boolean) {
    this.loginStatus.next(status);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('AYE_TOKEN');
  }

  logout(): void {
    localStorage.removeItem('AYE_TOKEN');
    localStorage.removeItem('AYE_USER');
    this.setLoginStatus(false);
  }

  // ---------- EXAMS ----------
  getExams(): Observable<any> {
    return this.http.get(`${this.baseUrl}/exams`, {
      headers: this.getAuthHeaders()
    });
  }

  // ---------- RESULTS ----------
  getResults(userEmail: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/results?email=${userEmail}`, {
      headers: this.getAuthHeaders()
    });
  }

  submitResult(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/results`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  getAttemptById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/attempts/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ---------- DASHBOARD ----------
  getResultsByStudent(studentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/attempts/student/${studentId}`, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('AYE_TOKEN');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // ---------- EXAM ----------
  getQuestionsByExam(examId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/questions/exam/${examId}`, {
      headers: this.getAuthHeaders()
    });
  }

  submitExam(examId: number, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/attempts/submit/${examId}`, payload, {
      headers: this.getAuthHeaders()
    });
  }
}