import { Component, input, output } from '@angular/core';

import { RecView } from '../../core/models';

@Component({
  selector: 'app-recommendations',
  template: `
    <section class="panel">
      <h2>Tavsiyalar</h2>
      @if (recs().length === 0) {
        <p class="empty">Hozircha tavsiya yo'q — tizim holatni kuzatmoqda.</p>
      }
      @for (r of recs(); track r.recId) {
        <article class="rec" [class.done]="r.status !== 'proposed'">
          <header>
            <strong class="action">{{ r.action }}</strong>
            @if (r.status !== 'proposed') {
              <span class="status" [class]="'s-' + r.status">{{ statusLabel(r.status) }}</span>
            }
          </header>
          <p class="reason">{{ r.reason }}</p>
          @if (r.benefit['wait_reduction_min'] != null) {
            <p class="benefit">
              Kutilayotgan foyda: kutish ~{{ r.benefit['wait_reduction_min'] }} daqiqaga kamayadi
              ({{ r.benefit['wait_before_min'] }} → {{ r.benefit['wait_after_min'] }} daq)
            </p>
          } @else if (r.benefit['freed_counters'] != null) {
            <p class="benefit">Kutilayotgan foyda: {{ r.benefit['freed_counters'] }} ta kassa bo'shaydi</p>
          }
          @if (r.status === 'proposed') {
            <footer>
              <button class="accept" (click)="respond.emit({ recId: r.recId, status: 'accepted' })">
                ✓ Qabul qilish
              </button>
              <button class="reject" (click)="respond.emit({ recId: r.recId, status: 'rejected' })">
                ✕ Rad etish
              </button>
            </footer>
          }
        </article>
      }
    </section>
  `,
  styles: `
    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
             padding: 16px 18px; }
    h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #374151; }
    .empty { color: #9ca3af; font-size: 14px; }

    .rec { border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px;
           padding: 12px 14px; margin-bottom: 10px; }
    .rec.done { border-color: #e5e7eb; background: #f9fafb; opacity: 0.75; }
    .rec header { display: flex; justify-content: space-between; align-items: center; }
    .action { font-size: 15px; color: #92400e; }
    .rec.done .action { color: #6b7280; }
    .reason { margin: 6px 0 2px; font-size: 13px; color: #4b5563; }
    .benefit { margin: 2px 0 8px; font-size: 13px; font-weight: 500; color: #15803d; }

    .status { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; }
    .s-accepted { background: #f0fdf4; color: #15803d; }
    .s-rejected { background: #fef2f2; color: #b91c1c; }

    footer { display: flex; gap: 8px; }
    button { border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px;
             font-weight: 600; cursor: pointer; }
    .accept { background: #16a34a; color: #fff; }
    .accept:hover { background: #15803d; }
    .reject { background: #f3f4f6; color: #4b5563; }
    .reject:hover { background: #e5e7eb; }
  `,
})
export class RecommendationsComponent {
  recs = input.required<RecView[]>();
  respond = output<{ recId: number; status: 'accepted' | 'rejected' }>();

  statusLabel(s: string): string {
    return s === 'accepted' ? 'Qabul qilindi' : s === 'rejected' ? 'Rad etildi' : s;
  }
}
