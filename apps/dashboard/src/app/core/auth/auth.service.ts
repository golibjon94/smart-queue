import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { GATEWAY_URL } from '../config';
import { AuthUser, LoginResponse } from './auth.models';

const TOKEN_KEY = 'sq_token';
const USER_KEY = 'sq_user';
const EXPIRY_KEY = 'sq_expires';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly _user = signal<AuthUser | null>(this.restoreUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null && !this.isExpired());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${GATEWAY_URL}/api/auth/login`, { username, password })
      .pipe(tap((res) => this.store(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private isExpired(): boolean {
    const exp = localStorage.getItem(EXPIRY_KEY);
    return exp ? new Date(exp).getTime() < Date.now() : true;
  }

  private store(res: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(EXPIRY_KEY, res.expiresAt);
    this._user.set(res.user);
  }

  private restoreUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    const exp = localStorage.getItem(EXPIRY_KEY);
    if (!raw || !exp || new Date(exp).getTime() < Date.now()) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
