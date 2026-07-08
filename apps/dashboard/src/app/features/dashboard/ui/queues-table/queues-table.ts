import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ServiceQueueState } from '../../models';

@Component({
  selector: 'app-queues-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.31s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-3.5 flex items-center justify-between">
        <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Navbatlar</h2>
        <span style="font-size:11px;color:var(--text-mut);">xizmat turlari bo'yicha</span>
      </div>

      <div
        class="grid gap-2"
        style="grid-template-columns:1.6fr .8fr .9fr 1fr;padding:0 4px 10px;font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-mut);border-bottom:1px solid var(--border);"
      >
        <span>Xizmat turi</span>
        <span class="text-center">Kutmoqda</span>
        <span class="text-center">Kassalar</span>
        <span class="text-right">Kutish</span>
      </div>

      @for (q of queues(); track q.serviceTypeId) {
        <div
          class="sq-rec grid items-center gap-2"
          style="grid-template-columns:1.6fr .8fr .9fr 1fr;padding:11px 4px;border-radius:10px;border-bottom:1px solid var(--border);"
        >
          <span style="font-size:13px;color:var(--text);">{{ q.name }}</span>
          <span
            class="justify-self-center"
            [style]="pill(q.estWaitMin)"
          >{{ q.waiting }}</span>
          <span class="justify-self-center" style="font-size:12px;color:var(--text-dim);">{{ q.openCounters }} ochiq</span>
          <span
            class="justify-self-end"
            style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:13px;"
            [style.color]="sevColor(q.estWaitMin)"
          >~{{ q.estWaitMin }} daq</span>
        </div>
      } @empty {
        <div style="padding:14px 4px;font-size:12.5px;color:var(--text-mut);">Ma'lumot yuklanmoqda…</div>
      }
    </section>
  `,
})
export class QueuesTable {
  readonly queues = input<ServiceQueueState[]>([]);

  sevColor(m: number): string {
    if (m > 10) return 'var(--danger)';
    if (m > 5) return 'var(--warn)';
    return 'var(--ok)';
  }

  pill(m: number): string {
    const rgb = m > 10 ? '--c-rgb' : m > 5 ? '--warn-rgb' : '--a-rgb';
    return `font-family:var(--font-mono,'JetBrains Mono');font-weight:600;font-size:12px;color:${this.sevColor(m)};background:rgba(var(${rgb}),.14);padding:3px 10px;border-radius:99px;`;
  }
}
