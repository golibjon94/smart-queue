import { Component, input } from '@angular/core';

import { BranchState } from '../../core/models';

@Component({
  selector: 'app-queue-status',
  template: `
    @if (state(); as s) {
      <section class="panel">
        <h2>Kassalar</h2>
        <div class="counters">
          @for (c of s.counters; track c.counterId) {
            <div class="counter" [class]="'st-' + c.status">
              <span class="num">{{ c.number }}</span>
              <span class="label">{{ statusLabel(c.status) }}</span>
            </div>
          }
        </div>
      </section>

      <section class="panel">
        <h2>Navbatlar</h2>
        <table class="queues">
          <thead>
            <tr><th>Xizmat</th><th>Kutmoqda</th><th>Kassalar</th><th>Taxminiy kutish</th></tr>
          </thead>
          <tbody>
            @for (q of s.queues; track q.serviceTypeId) {
              <tr>
                <td>{{ q.name }}</td>
                <td><span class="badge" [class]="waitClass(q.estWaitMin)">{{ q.waiting }}</span></td>
                <td class="muted">{{ q.openCounters }} ochiq</td>
                <td [class]="waitClass(q.estWaitMin)">~{{ q.estWaitMin }} daq</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styles: `
    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
             padding: 16px 18px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #374151; }

    .counters { display: flex; flex-wrap: wrap; gap: 10px; }
    .counter { width: 72px; border-radius: 10px; padding: 10px 0; text-align: center;
               border: 1.5px solid transparent; }
    .counter .num { display: block; font-size: 22px; font-weight: 700; }
    .counter .label { font-size: 11px; }
    .st-serving { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .st-idle    { background: #f9fafb; border-color: #e5e7eb; color: #6b7280; }
    .st-closed  { background: #f9fafb; border-color: #e5e7eb; border-style: dashed;
                  color: #9ca3af; }

    .queues { width: 100%; border-collapse: collapse; font-size: 14px; }
    .queues th { text-align: left; font-size: 12px; font-weight: 500; color: #9ca3af;
                 padding: 4px 8px; border-bottom: 1px solid #f3f4f6; }
    .queues td { padding: 8px; border-bottom: 1px solid #f3f4f6; color: #111827; }
    .muted { color: #6b7280; }

    .badge { display: inline-block; min-width: 26px; text-align: center;
             border-radius: 999px; padding: 2px 8px; font-weight: 600;
             background: #f3f4f6; }
    .w-ok      { color: #15803d; } .badge.w-ok      { background: #f0fdf4; }
    .w-warn    { color: #b45309; } .badge.w-warn    { background: #fffbeb; }
    .w-serious { color: #b91c1c; } .badge.w-serious { background: #fef2f2; }
  `,
})
export class QueueStatusComponent {
  state = input.required<BranchState | null>();

  statusLabel(s: string): string {
    return s === 'serving' ? 'xizmatda' : s === 'idle' ? "bo'sh" : 'yopiq';
  }

  waitClass(estWaitMin: number): string {
    if (estWaitMin > 10) return 'w-serious';
    if (estWaitMin > 5) return 'w-warn';
    return 'w-ok';
  }
}
