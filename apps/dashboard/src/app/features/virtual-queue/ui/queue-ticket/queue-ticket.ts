import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CountUp } from '../../../../shared/count-up/count-up';
import { VqApi } from '../../data/vq-api';
import { VqRealtimeService } from '../../data/vq-realtime.service';
import { VirtualTicket, VqStatus } from '../../models/vq.model';

/**
 * Mijoz sahifasi — JONLI pozitsiya + ETA (`/q/{token}`). Public, mobil-birinchi.
 * Boshlang'ich holat bir martalik HTTP (`/status`), keyin barcha yangilanish SignalR
 * `vqPositionUpdated` push orqali (polling yo'q). "Chiqish" -> /leave (abandoned).
 * Xizmat yakunlangach oddiy baho+izoh formasi (sentiment demo uchun).
 */
@Component({
  selector: 'app-queue-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CountUp],
  host: {
    class: 'relative block min-h-screen',
    style: 'background:var(--bg);color:var(--text);',
  },
  template: `
    <div class="pointer-events-none fixed inset-0" [style.background]="'var(--bg-radials)'"></div>

    <div class="relative mx-auto flex min-h-screen flex-col px-5 py-8" style="max-width:440px;z-index:2;">
      <!-- topbar -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative grid place-items-center" style="width:36px;height:36px;border-radius:11px;background:conic-gradient(from 140deg,var(--accent-d),var(--accent-a),var(--accent-b),var(--accent-c));">
            <div class="absolute" style="inset:2px;border-radius:9px;background:var(--bg);"></div>
            <i class="pi pi-bolt relative" style="font-size:15px;color:var(--accent-d);"></i>
          </div>
          <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:15px;">smart-queue</span>
        </div>
        <span class="flex items-center gap-1.5" [style]="connChip()">
          <span [style]="connDot()"></span>{{ connected() ? 'Jonli' : 'Ulanmoqda…' }}
        </span>
      </div>

      @if (ticket(); as t) {
        <!-- talon raqami -->
        <div class="sq-rise mb-4 flex items-center justify-between" style="border-radius:14px;padding:12px 16px;background:var(--chip);border:1px solid var(--chip-bd);">
          <span style="font-size:12.5px;color:var(--text-dim);">Talon raqami</span>
          <span style="font-family:var(--font-mono,'JetBrains Mono');font-weight:600;font-size:15px;color:var(--accent-d);">{{ t.ticketNumber }}</span>
        </div>

        @if (isActive()) {
          <!-- ASOSIY: pozitsiya -->
          <section
            class="sq-rise relative overflow-hidden text-center"
            style="animation-delay:.05s;border-radius:26px;padding:34px 24px 30px;background:linear-gradient(160deg,var(--panel-alt-1),var(--panel-alt-2));border:1px solid var(--border-accent);box-shadow:0 30px 60px -30px rgba(0,0,0,.5),var(--inset);"
          >
            <div class="absolute" style="top:-40px;right:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(var(--d-rgb),.25),transparent 70%);"></div>

            <div style="font-size:13px;color:var(--text-dim);letter-spacing:.3px;">Navbatdagi o'rningiz</div>
            <div class="relative flex items-end justify-center gap-2" style="margin-top:10px;">
              <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:86px;line-height:.9;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;" [sqCountUp]="t.position"></span>
              <span style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:26px;color:var(--text-dim);margin-bottom:12px;">-o'rin</span>
            </div>

            <!-- ETA -->
            <div class="mx-auto mt-7 flex items-center justify-center gap-2.5" style="max-width:280px;border-radius:16px;padding:15px;background:rgba(var(--a-rgb),.1);border:1px solid rgba(var(--a-rgb),.28);">
              <i class="pi pi-clock" style="font-size:19px;color:var(--ok);"></i>
              <span style="font-size:14px;color:var(--text-dim);">Taxminiy kutish</span>
              <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:22px;color:var(--ok);">~<span [sqCountUp]="etaMin()"></span> daq</span>
            </div>

            <div class="mt-6 flex items-center justify-center gap-2" [style]="statusPill(t.status)">
              <span [style]="statusDot(t.status)"></span>{{ statusLabel(t.status) }}
            </div>
          </section>

          <p class="mt-5 text-center" style="font-size:13px;color:var(--text-dim);line-height:1.55;">
            Navbatingiz yaqinlashganda ushbu ekran avtomatik yangilanadi.<br />Iltimos, telefoningizni yoningizda saqlang.
          </p>

          <div class="flex-1"></div>

          <button
            type="button"
            class="sq-mini mt-6 flex w-full items-center justify-center gap-2"
            style="height:50px;border-radius:14px;cursor:pointer;font-family:var(--font-sans,'Sora');font-weight:600;font-size:14px;color:var(--text-dim);background:var(--chip);border:1px solid var(--chip-bd);"
            [disabled]="leaving()"
            (click)="leave()"
          >
            @if (leaving()) {
              <i class="pi pi-spin pi-spinner" style="font-size:14px;"></i> Chiqilmoqda…
            } @else {
              <i class="pi pi-sign-out" style="font-size:14px;"></i> Navbatdan chiqish
            }
          </button>
        } @else {
          <!-- yakuniy holatlar: completed / abandoned / called -->
          <section
            class="sq-rise text-center"
            style="animation-delay:.05s;border-radius:26px;padding:38px 24px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
          >
            <div class="mx-auto grid place-items-center" [style]="endIconChip()">
              <i [class]="endIcon()" style="font-size:34px;" [style.color]="endColor()"></i>
            </div>
            <h1 style="margin:20px 0 0;font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:24px;">{{ endTitle() }}</h1>
            <p style="margin:10px 0 0;font-size:14px;color:var(--text-dim);line-height:1.55;">{{ endSubtitle() }}</p>
          </section>

          @if (t.status === 'completed' && !feedbackSent()) {
            <!-- baho + izoh (sentiment demo) -->
            <section
              class="sq-rise mt-5"
              style="animation-delay:.12s;border-radius:22px;padding:22px 20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
            >
              <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:16px;">Xizmatni baholang</h2>
              <p style="margin:6px 0 0;font-size:12.5px;color:var(--text-dim);">Fikringiz xizmat sifatini yaxshilashga yordam beradi.</p>

              <div class="mt-4 flex justify-center gap-2">
                @for (s of stars; track s) {
                  <button type="button" class="sq-mini grid place-items-center" style="width:46px;height:46px;border-radius:12px;border:1px solid var(--chip-bd);background:var(--chip);cursor:pointer;" (click)="rating.set(s)">
                    <i class="pi pi-star-fill" style="font-size:22px;" [style.color]="s <= rating() ? 'var(--warn)' : 'var(--text-mut)'"></i>
                  </button>
                }
              </div>

              <textarea
                class="sq-input mt-4"
                style="height:auto;min-height:84px;padding:12px 14px;resize:vertical;line-height:1.5;"
                placeholder="Izoh qoldiring (masalan: navbat uzun edi, xizmat tez bo'ldi…)"
                [value]="comment()"
                (input)="comment.set($any($event.target).value)"
              ></textarea>

              <button
                type="button"
                class="sq-btn mt-4 flex w-full items-center justify-center gap-2"
                style="height:48px;border:none;border-radius:13px;cursor:pointer;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:14px;color:var(--ok-ink);background:var(--grad);box-shadow:0 12px 30px -12px rgba(var(--d-rgb),.7);"
                [disabled]="rating() === 0 || sending()"
                (click)="sendFeedback(t.branchId)"
              >
                @if (sending()) {
                  <i class="pi pi-spin pi-spinner" style="font-size:14px;"></i> Yuborilmoqda…
                } @else {
                  <i class="pi pi-send" style="font-size:14px;"></i> Bahoni yuborish
                }
              </button>
            </section>
          }

          @if (feedbackSent()) {
            <div class="sq-rise mt-5 flex items-center justify-center gap-2.5" style="border-radius:16px;padding:16px;background:rgba(var(--a-rgb),.1);border:1px solid rgba(var(--a-rgb),.28);color:var(--ok);font-size:13.5px;">
              <i class="pi pi-check-circle" style="font-size:18px;"></i>
              Fikringiz uchun rahmat!
            </div>
          }
        }
      } @else {
        <div class="grid flex-1 place-items-center" style="color:var(--text-mut);font-size:13.5px;">
          @if (loadError()) {
            <div class="text-center">
              <i class="pi pi-exclamation-circle" style="font-size:30px;color:var(--danger);"></i>
              <p style="margin:14px 0 0;">Talon topilmadi yoki muddati o'tgan.</p>
            </div>
          } @else {
            <span><i class="pi pi-spin pi-spinner" style="font-size:22px;"></i></span>
          }
        </div>
      }

      <div class="mt-8 text-center" style="font-size:10.5px;color:var(--text-mut);font-family:var(--font-mono,'JetBrains Mono');">
        smart-queue · onlayn navbat
      </div>
    </div>
  `,
})
export default class QueueTicket {
  private readonly api = inject(VqApi);
  private readonly realtime = inject(VqRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly token = input.required<string>();

  protected readonly stars = [1, 2, 3, 4, 5];

  private readonly _ticket = signal<VirtualTicket | null>(null);
  readonly ticket = this._ticket.asReadonly();
  readonly connected = this.realtime.connected;

  readonly loadError = signal(false);
  readonly leaving = signal(false);
  readonly rating = signal(0);
  readonly comment = signal('');
  readonly sending = signal(false);
  readonly feedbackSent = signal(false);

  readonly isActive = computed(() => {
    const s = this._ticket()?.status;
    return s === 'waiting' || s === 'called';
  });

  readonly etaMin = computed(() => {
    const sec = this._ticket()?.etaSec ?? 0;
    return sec > 0 ? Math.max(1, Math.round(sec / 60)) : 0;
  });

  constructor() {
    // token o'rnatilgach: boshlang'ich holat + real-vaqt ulanish
    effect(() => {
      const token = this.token();
      if (!token) return;
      this.loadStatus(token);
      void this.realtime.connect(token);
    });

    // real-vaqt push -> joriy talon
    effect(() => {
      const t = this.realtime.ticket();
      if (t && t.token === this.token()) this._ticket.set(t);
    });

    this.destroyRef.onDestroy(() => void this.realtime.disconnect());
  }

  private loadStatus(token: string): void {
    this.api
      .status(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => this._ticket.set(t),
        error: () => this.loadError.set(true),
      });
  }

  leave(): void {
    const token = this.token();
    this.leaving.set(true);
    this.api
      .leave(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => {
          this.leaving.set(false);
          this._ticket.set(t);
        },
        error: () => this.leaving.set(false),
      });
  }

  sendFeedback(branchId: number): void {
    if (this.rating() === 0) return;
    this.sending.set(true);
    this.api
      .submitFeedback(branchId, this.rating(), this.comment())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.feedbackSent.set(true);
        },
        error: () => {
          // demo hech qachon buzilmasin — baribir rahmat ko'rsatamiz
          this.sending.set(false);
          this.feedbackSent.set(true);
        },
      });
  }

  // --- status ko'rinishi ---

  statusLabel(s: VqStatus): string {
    if (s === 'waiting') return 'Kutilmoqda';
    if (s === 'called') return 'Sizni chaqirishmoqda';
    if (s === 'serving') return 'Xizmat ko\'rsatilmoqda';
    if (s === 'completed') return 'Yakunlandi';
    return 'Bekor qilindi';
  }

  private statusRgb(s: VqStatus): string {
    if (s === 'called') return '--warn-rgb';
    if (s === 'completed') return '--a-rgb';
    if (s === 'abandoned') return '--c-rgb';
    return '--d-rgb';
  }

  statusPill(s: VqStatus): string {
    const rgb = this.statusRgb(s);
    return `display:inline-flex;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:99px;background:rgba(var(${rgb}),.14);color:rgb(var(${rgb}));border:1px solid rgba(var(${rgb}),.3);`;
  }

  statusDot(s: VqStatus): string {
    const rgb = this.statusRgb(s);
    return `width:7px;height:7px;border-radius:50%;background:rgb(var(${rgb}));animation:sq-pulse 1.6s infinite;`;
  }

  connChip(): string {
    const rgb = this.connected() ? '--a-rgb' : '--warn-rgb';
    return `font-family:var(--font-mono,'JetBrains Mono');font-size:10.5px;font-weight:600;padding:5px 10px;border-radius:99px;color:rgb(var(${rgb}));background:rgba(var(${rgb}),.12);border:1px solid rgba(var(${rgb}),.28);`;
  }

  connDot(): string {
    const rgb = this.connected() ? '--a-rgb' : '--warn-rgb';
    return `width:6px;height:6px;border-radius:50%;background:rgb(var(${rgb}));${this.connected() ? 'animation:sq-pulse 1.6s infinite;' : ''}`;
  }

  // --- yakuniy holat ko'rinishi ---

  endIcon(): string {
    const s = this._ticket()?.status;
    if (s === 'completed') return 'pi pi-check-circle';
    if (s === 'serving') return 'pi pi-user';
    if (s === 'abandoned') return 'pi pi-sign-out';
    return 'pi pi-bell';
  }

  endColor(): string {
    const s = this._ticket()?.status;
    if (s === 'abandoned') return 'var(--danger)';
    if (s === 'completed') return 'var(--ok)';
    return 'var(--accent-d)';
  }

  endIconChip(): string {
    const s = this._ticket()?.status ?? 'completed';
    const rgb = this.statusRgb(s);
    return `width:78px;height:78px;border-radius:22px;background:rgba(var(${rgb}),.12);border:1px solid rgba(var(${rgb}),.3);`;
  }

  endTitle(): string {
    const s = this._ticket()?.status;
    if (s === 'completed') return 'Xizmat yakunlandi';
    if (s === 'serving') return 'Marhamat, kassaga o\'ting';
    if (s === 'abandoned') return 'Siz navbatdan chiqdingiz';
    return 'Sizni chaqirishmoqda';
  }

  endSubtitle(): string {
    const s = this._ticket()?.status;
    if (s === 'completed') return 'Bizni tanlaganingiz uchun rahmat. Fikringizni qoldiring.';
    if (s === 'serving') return 'Xodim sizga xizmat ko\'rsatishga tayyor.';
    if (s === 'abandoned') return 'Xohlasangiz, QR kodni qayta skanlab navbatga qo\'shilishingiz mumkin.';
    return 'Iltimos, kassaga yaqinlashing.';
  }
}
