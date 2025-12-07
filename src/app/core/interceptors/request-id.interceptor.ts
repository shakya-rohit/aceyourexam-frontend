import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Adds X-Request-Id header if not already present.
 * Uses global crypto.randomUUID() when available, otherwise falls back to uuidv4().
 */
@Injectable()
export class RequestIdInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // If request already contains a request id, pass it through.
    if (req.headers.has('X-Request-Id')) {
      return next.handle(req);
    }

    const requestId = this.generateRequestId();

    // Clone request and set header
    const cloned = req.clone({
      headers: req.headers.set('X-Request-Id', requestId)
    });

    return next.handle(cloned);
  }

  private generateRequestId(): string {
    // Use native if available (modern browsers)
    const globalAny = window as any;
    if (globalAny.crypto && typeof globalAny.crypto.randomUUID === 'function') {
      try {
        return globalAny.crypto.randomUUID();
      } catch (e) {
        // fallback to uuidv4 below
      }
    }
    // fallback: simple UUID v4 generator
    return this.uuidv4();
  }

  // RFC4122-compliant v4 UUID generator (fallback)
  private uuidv4(): string {
    // Using timestamp + random to reduce collisions
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}