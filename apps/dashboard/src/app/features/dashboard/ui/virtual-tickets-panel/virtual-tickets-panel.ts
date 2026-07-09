import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { VirtualTicketRow, VqStatus } from '../../../virtual-queue/models/vq.model';

/**
 * VAZIFA 2 (menejer tomoni) — masofadan (QR) kelayotgan virtual talonlar ro'yxati.
 * Fizik talonlar bilan bir dashboard'da, "virtual" belgisi bilan farqlanadi.
 * SignalR mijoz guruhlariga bog'liq emas — HTTP yuklash + qo'lda yangilash.
 */
@Component({
  selector: 'app-virtual-tickets-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.34s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-3.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Masofadan navbat</h2>
          @if (activeCount() > 0) {
            <span style="font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:rgba(var(--b-rgb),.14);color:var(--accent-b);">{{ activeCount() }} faol</span>
          }
        </div>
        <button
          type="button"
          class="sq-mini grid place-items-center"
          style="width:32px;height:32px;border-radius:9px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text-dim);cursor:pointer;"
          title="Yangilash"
          (click)="refresh.emit()"
        >
          <i class="pi pi-refresh" style="font-size:13px;"></i>
        </button>
      </div>

      @if (tickets().length === 0) {
        <div class="flex items-center gap-2.5" style="padding:6px 0;font-size:13px;color:var(--text-dim);">
          <i class="pi pi-mobile" style="font-size:17px;color:var(--accent-b);"></i>
          Hozircha masofadan talon yo'q — QR orqali qo'shilganlar shu yerda ko'rinadi.
        </div>
      }

      <div class="flex flex-col gap-2.5">
        @for (t of tickets(); track t.token) {
          <div class="sq-rec flex items-center gap-3" style="padding:12px;border-radius:13px;background:var(--chip);border:1px solid var(--border);">
            <span class="grid shrink-0 place-items-center" style="width:34px;height:34px;border-radius:10px;background:rgba(var(--b-rgb),.12);border:1px solid rgba(var(--b-rgb),.3);">
              <i class="pi pi-mobile" style="font-size:15px;color:var(--accent-b);"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span style="font-family:var(--font-mono,'JetBrains Mono');font-weight:600;font-size:13.5px;color:var(--text);">{{ t.ticketNumber }}</span>
                <span style="font-size:9px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:rgba(var(--b-rgb),.14);color:var(--accent-b);border:1px solid rgba(var(--b-rgb),.3);">virtual</span>
              </div>
              <div style="margin-top:3px;font-size:11px;color:var(--text-mut);">Xizmat #{{ t.serviceTypeId }} · {{ time(t.joinedAt) }}</div>
            </div>
            <span [style]="statusPill(t.status)">{{ statusLabel(t.status) }}</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class VirtualTicketsPanel {
  readonly tickets = input<VirtualTicketRow[]>([]);
  readonly refresh = output<void>();

  activeCount(): number {
    return this.tickets().filter((t) => t.status === 'waiting' || t.status === 'called').length;
  }

  statusLabel(s: VqStatus): string {
    if (s === 'waiting') return 'kutmoqda';
    if (s === 'called') return 'chaqirildi';
    if (s === 'serving') return 'xizmatda';
    if (s === 'completed') return 'yakunlandi';
    return 'chiqdi';
  }

  private statusRgb(s: VqStatus): string {
    if (s === 'called') return '--warn-rgb';
    if (s === 'completed' || s === 'serving') return '--a-rgb';
    if (s === 'abandoned') return '--c-rgb';
    return '--d-rgb';
  }

  statusPill(s: VqStatus): string {
    const rgb = this.statusRgb(s);
    return `font-size:10px;font-weight:600;padding:3px 9px;border-radius:99px;background:rgba(var(${rgb}),.14);color:rgb(var(${rgb}));border:1px solid rgba(var(${rgb}),.3);white-space:nowrap;`;
  }

  time(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('uz', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    }).format(d);
  }
}
