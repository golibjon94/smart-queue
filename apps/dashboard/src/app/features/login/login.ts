import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ThemeSwitcher } from '../../core/theme/theme-switcher/theme-switcher';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ThemeSwitcher],
  host: {
    class: 'relative block h-screen overflow-hidden',
    style: 'background: var(--bg); color: var(--text);',
  },
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Demo qulayligi uchun oldindan to'ldirilgan (kirish ma'lumotlari ekranda ham ko'rsatilgan).
  username = signal('admin');
  password = signal('Admin!2026');
  showPassword = signal(false);
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
            ? "Login yoki parol noto'g'ri"
            : 'Serverga ulanib bo\'lmadi. Gateway ishlayaptimi?',
        );
      },
    });
  }
}
