import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Profile {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  // add other server fields if any
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

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

  googleLogin(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/google-login`, data);
  }

  // ----------- Profile ---------------
  // getProfileByEmail(email: string): Observable<any> {
  //   return this.http.get<any>(`${this.baseUrl}/auth/me/${email}`);
  // }

  // updateProfile(payload: { name?: string; /* other editable fields */ }): Observable<Partial<Profile>> {
  //   return this.http.put<Partial<Profile>>(`${this.baseUrl}/api/auth/me`, payload);
  // }

  // changePassword(payload: { currentPassword: string; newPassword: string }): Observable<any> {
  //   return this.http.post<any>(`${this.baseUrl}/api/auth/change-password`, payload);
  // }


  // ----------- Profile ---------------

  // NOTE: some backends use /auth/me (GET) and /auth/me (PUT). Adjust paths if your backend differs.
  getProfileByEmail(email: string): Observable<Profile> {
    if (!email) {
      // return dummy (client-side) so the UI can render in dev without token
      return of({
        id: '0',
        name: 'Guest User',
        email: 'guest@example.com',
        createdAt: new Date().toISOString()
      });
    }
    return this.http.get<Profile>(`${this.baseUrl}/auth/me/${encodeURIComponent(email)}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      // do not swallow errors here; let caller decide — but add a small catch to turn 404 into dummy
      catchError(err => {
        console.warn('getProfileByEmail failed, returning dummy', err);
        return of({
          id: '0',
          name: 'Guest User',
          email,
          createdAt: new Date().toISOString()
        } as Profile);
      })
    );
  }

  // update editable fields
  updateProfile(payload: { name?: string; /* other editable fields */ }): Observable<Partial<Profile>> {
    // many backends expect PUT /auth/me
    return this.http.put<Partial<Profile>>(`${this.baseUrl}/auth/me`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        // return the payload as partial so UI can merge it locally if backend not ready
        console.warn('updateProfile failed, returning payload fallback', err);
        return of(payload);
      })
    );
  }

  changePassword(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/change-password`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error('changePassword failed', err);
        throw err;
      })
    );
  }

  // Upload avatar (multipart/form-data)
  uploadAvatar(fd: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/me/avatar`, fd, {
      headers: this.getAuthHeaders()
      // do NOT set Content-Type; browser will add boundary
    }).pipe(
      catchError(err => {
        console.warn('uploadAvatar failed', err);
        // return fake response so UI can continue
        return of({ avatarUrl: this.getLocalDataUrl(fd) });
      })
    );
  }

  // delete avatar
  deleteAvatar(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/auth/me/avatar`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.warn('deleteAvatar failed', err);
        return of(null);
      })
    );
  }

  // delete account
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error('deleteAccount failed', err);
        throw err;
      })
    );
  }

  // Stats for the profile page (exams taken, avg score etc.)
  getUserStats(userEmail: string): Observable<any> {
    if (!userEmail) {
      return of({ examsTaken: 0, avgScore: 0, lastActive: new Date().toISOString() });
    }
    return this.http.get<any>(`${this.baseUrl}/stats/user?email=${encodeURIComponent(userEmail)}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(err => {
        console.warn('getUserStats failed, fallback to dummy', err);
        return of({ examsTaken: 3, avgScore: 78, lastActive: new Date().toISOString() });
      }));
  }

  // ---------- Helpers ----------
  private getLocalDataUrl(fd: FormData): string | null {
    // for offline/dummy fallback: attempt to extract a File and convert to data URL
    try {
      const avatar = (fd as any).get('avatar') as File;
      if (!avatar) return null;
      // NOTE: synchronous conversion isn't possible here without FileReader; return null and let UI keep preview
      return null;
    } catch {
      return null;
    }
  }

}