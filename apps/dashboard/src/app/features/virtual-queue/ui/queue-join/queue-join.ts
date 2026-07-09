import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { VqApi } from '../../data/vq-api';

/**
 * Mijoz sahifasi — QR skanlangandan keyingi TASDIQLASH ekrani (`/q/join`).
 * Public, login yo'q, mobil-birinchi. `branch`/`service`/`label` query param'lari
 * withComponentInputBinding orqali input'larga bog'lanadi.
 * Tasdiqlagach POST /api/vq/join -> tokenli sahifaga (`/q/{token}`) o'tadi.
 */
@Component({
  selector: 'app-queue-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block min-h-screen',
    style: 'background:var(--bg);color:var(--text);',
  },
  template: `
    <!-- yumshoq aurora radiallar -->
    <div class="pointer-events-none fixed inset-0" [style.background]="'var(--bg-radials)'"></div>

    <div class="relative mx-auto flex min-h-screen flex-col justify-center px-5 py-10" style="max-width:440px;z-index:2;">
      <!-- brand -->
      <div class="sq-rise mb-7 flex items-center gap-3">
        <div class="relative grid place-items-center" style="width:44px;height:44px;border-radius:13px;background:conic-gradient(from 140deg,var(--accent-d),var(--accent-a),var(--accent-b),var(--accent-c));box-shadow:0 10px 26px -8px rgba(var(--d-rgb),.7);">
          <div class="absolute" style="inset:2px;border-radius:11px;background:var(--bg);"></div>
          <i class="pi pi-bolt relative" style="font-size:18px;color:var(--accent-d);"></i>
        </div>
        <div>
          <div style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:18px;letter-spacing:-.3px;">smart-queue</div>
          <div style="font-size:11.5px;color:var(--text-dim);">Onlayn navbat</div>
        </div>
      </div>

      <!-- karta -->
      <section
        class="sq-rise"
        style="animation-delay:.08s;border-radius:24px;padding:28px 24px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:0 30px 60px -30px rgba(0,0,0,.5),var(--inset);"
      >
        <span
          class="inline-flex items-center gap-2"
          style="font-family:var(--font-mono,'JetBrains Mono');font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--accent-d);padding:5px 11px;border-radius:99px;background:rgba(var(--d-rgb),.12);border:1px solid rgba(var(--d-rgb),.28);"
        >
          <i class="pi pi-qrcode" style="font-size:12px;"></i>
          Masofadan navbat
        </span>

        <h1 style="margin:18px 0 0;font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-.4px;">
          Navbatga qo'shilasizmi?
        </h1>
        <p style="margin:9px 0 0;font-size:14px;color:var(--text-dim);line-height:1.5;">
          Bu yerda turmaysiz — telefoningizda o'z o'rningizni va taxminiy kutish vaqtini jonli kuzatasiz.
        </p>

        <!-- xizmat kartasi -->
        <div class="mt-6 flex items-center gap-3.5" style="border-radius:16px;padding:16px;background:var(--chip);border:1px solid var(--chip-bd);">
          <span class="grid shrink-0 place-items-center" style="width:46px;height:46px;border-radius:13px;background:linear-gradient(150deg,rgba(var(--b-rgb),.22),rgba(var(--b-rgb),.05));border:1px solid rgba(var(--b-rgb),.3);">
            <i class="pi pi-users" style="font-size:20px;color:var(--accent-b);"></i>
          </span>
          <div class="min-w-0 flex-1">
            <div style="font-size:11.5px;color:var(--text-mut);">Xizmat turi</div>
            <div style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:16px;color:var(--text);">{{ serviceLabel() }}</div>
          </div>
        </div>

        @if (error()) {
          <div class="mt-4 flex items-center gap-2.5" style="padding:11px 13px;border-radius:12px;background:rgba(var(--c-rgb),.1);border:1px solid rgba(var(--c-rgb),.3);color:var(--danger);font-size:13px;">
            <i class="pi pi-exclamation-triangle" style="font-size:14px;"></i>
            {{ error() }}
          </div>
        }

        <button
          type="button"
          class="sq-btn mt-6 flex w-full items-center justify-center gap-2.5"
          style="height:54px;border:none;border-radius:15px;cursor:pointer;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15.5px;color:var(--ok-ink);background:var(--grad);box-shadow:0 14px 34px -12px rgba(var(--d-rgb),.75);"
          [disabled]="loading()"
          (click)="join()"
        >
          @if (loading()) {
            <i class="pi pi-spin pi-spinner" style="font-size:16px;"></i> Qo'shilmoqda…
          } @else {
            <i class="pi pi-arrow-right" style="font-size:15px;"></i> Navbatga qo'shilish
          }
        </button>

        <p class="mt-4 text-center" style="font-size:11.5px;color:var(--text-mut);">
          Ro'yxatdan o'tish shart emas · bepul
        </p>
      </section>
    </div>
  `,
})
export default class QueueJoin {
  private readonly api = inject(VqApi);
  private readonly router = inject(Router);

  // query param'lardan (string) keladi
  readonly branch = input<string>();
  readonly service = input<string>();
  readonly label = input<string>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly serviceLabel = computed(() => {
    const l = this.label();
    if (l && l.trim()) return l.trim();
    const s = this.service();
    return s ? `Xizmat #${s}` : 'Umumiy navbat';
  });

  join(): void {
    const branchId = Number(this.branch() ?? 1) || 1;
    const serviceTypeId = Number(this.service() ?? 1) || 1;

    this.loading.set(true);
    this.error.set(null);

    this.api.join({ branchId, serviceTypeId }).subscribe({
      next: (t) => {
        this.loading.set(false);
        void this.router.navigate(['/q', t.token]);
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Navbatga qo'shib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.");
      },
    });
  }
}
