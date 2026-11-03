import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QuestionBankService {

    private baseUrl = environment.apiBaseUrl;

    constructor(private http: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('AYE_TOKEN');
        return new HttpHeaders({
            Authorization: `Bearer ${token}`
        });
    }

    getAll() {
        return this.http.get<any[]>(`${this.baseUrl}/question-bank`, {
            headers: this.getAuthHeaders()
        });
    }

    create(payload: any) {
        return this.http.post(`${this.baseUrl}/question-bank`, payload, {
            headers: this.getAuthHeaders()
        });
    }

    update(id: number, payload: any) {
        return this.http.put(`${this.baseUrl}/question-bank/${id}`, payload, {
            headers: this.getAuthHeaders()
        });
    }

    delete(id: number) {
        return this.http.delete(`${this.baseUrl}/question-bank/${id}`, {
            headers: this.getAuthHeaders()
        });
    }

    search(filters: {
        subject?: string;
        topic?: string;
        difficulty?: string[];
        q?: string;
        examTypeId?: number | null;
    }) {
        let params: any = {};

        if (filters.subject) params.subject = filters.subject;
        if (filters.topic) params.topic = filters.topic;
        if (filters.q) params.q = filters.q;
        if (filters.examTypeId) params.examTypeId = filters.examTypeId;

        if (filters.difficulty && filters.difficulty.length > 0) {
            params.difficulty = filters.difficulty.join(',');
        }

        return this.http.get<any[]>(`${this.baseUrl}/question-bank/search`, {
            headers: this.getAuthHeaders(),
            params
        });
    }

    getPaged(params: {
        page: number;
        size: number;
        subject?: string;
        topic?: string;
        difficulty?: string;
        q?: string;
    }) {
        return this.http.get<any>(`${this.baseUrl}/question-bank/paged`, {
            headers: this.getAuthHeaders(),
            params: params as any
        });
    }

    getPracticeQuestions(requestBody: any) {
        return this.http.post<{ sessionId: string; questions: any[] }>(`${this.baseUrl}/prepare/fetch-questions`, requestBody, {
            headers: this.getAuthHeaders()
        });
    }

    submitPracticeAnswer(requestBody: { sessionId: string; questionId: number; selectedOptionIndex: number }) {
        return this.http.post<{ questionId: number; correctOptionIndex: number; isCorrect: boolean; explanation: string | null }>(
            `${this.baseUrl}/prepare/answer`, requestBody, { headers: this.getAuthHeaders() }
        );
    }

    submitPracticeTest(requestBody: { sessionId: string; answers: Array<{ questionId: number; selectedAnswer: string | null }> }) {
        return this.http.post<any>(`${this.baseUrl}/prepare/submit`, requestBody, {
            headers: this.getAuthHeaders()
        });
    }



}
