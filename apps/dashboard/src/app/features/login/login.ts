import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.username() || !this.password()) {
      this.error.set('Login va parolni kiriting');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.username().trim(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? 'Login yoki parol noto\'g\'ri'
            : 'Serverga ulanib bo\'lmadi. Gateway ishlayaptimi?',
        );
      },
    });
  }
}
