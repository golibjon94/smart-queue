import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  ActionType,
  Recommendation,
  RecommendationResponse,
  RecommendationStatus,
} from '../../models';

export interface RecommendationDecision {
  recId: number;
  status: RecommendationResponse;
}

@Component({
  selector: 'app-recommendations-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise flex flex-col overflow-hidden"
      style="animation-delay:.33s;border-radius:20px;background:linear-gradient(160deg,var(--panel-alt-1),var(--panel-alt-2));border:1px solid var(--border-accent);box-shadow:var(--inset);"
    >
      <div class="flex items-center justify-between gap-3" style="padding:20px 20px 14px;border-bottom:1px solid var(--border);">
        <div class="flex items-center gap-[11px]">
          <div class="relative" style="width:30px;height:30px;">
            <div class="absolute" style="inset:0;border-radius:9px;border:1.5px solid transparent;border-top-color:var(--accent-c);border-right-color:var(--accent-b);animation:sq-spin 3s linear infinite;"></div>
            <div class="absolute" style="inset:7px;border-radius:50%;background:radial-gradient(circle,#fff,var(--accent-c));box-shadow:0 0 10px var(--accent-c);"></div>
          </div>
          <div>
            <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">AI Tavsiyalar</h2>
            <p style="margin:3px 0 0;font-size:11px;color:var(--text-dim);">real-vaqtda generatsiya qilinmoqda</p>
          </div>
        </div>
        @if (proposedCount() > 0) {
          <span style="font-size:10.5px;font-weight:600;padding:4px 10px;border-radius:99px;background:rgba(var(--c-rgb),.16);color:var(--accent-c);">{{ proposedCount() }} faol</span>
        }
      </div>

      <div class="sq-scroll flex flex-col gap-[11px]" style="max-height:360px;overflow-y:auto;padding:14px 18px 18px;">
        @if (recommendations().length === 0) {
          <div class="flex items-center gap-2.5" style="padding:8px 0;font-size:13px;color:var(--text-dim);">
            <i class="pi pi-check-circle" style="font-size:17px;color:var(--ok);"></i>
            Hozircha tavsiya yo'q — tizim holatni kuzatmoqda.
          </div>
        }

        @for (r of recommendations(); track r.recId) {
          <div class="sq-rec" [style]="cardStyle(r.status)">
            <div class="flex items-center gap-2.5">
              <span class="grid shrink-0 place-items-center" style="width:26px;height:26px;border-radius:8px;background:rgba(var(--c-rgb),.16);border:1px solid rgba(var(--c-rgb),.3);">
                <i [class]="icon(r.actionType)" style="font-size:13px;color:var(--accent-c);"></i>
              </span>
              <strong style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:14px;color:var(--text);flex:1;">{{ r.action }}</strong>
              @if (r.status === 'accepted') {
                <span style="font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:rgba(var(--a-rgb),.15);color:var(--ok);">Qabul qilindi</span>
              } @else if (r.status === 'rejected') {
                <span style="font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--chip);color:var(--text-dim);">Rad etildi</span>
              }
            </div>

            <p style="margin:9px 0 0;font-size:12.5px;color:var(--text-dim);line-height:1.5;">{{ r.reason }}</p>

            @if (r.benefit['wait_reduction_min'] != null) {
              <p class="flex items-center gap-1.5" style="margin:8px 0 0;font-size:12px;font-weight:600;color:var(--ok);">
                <i class="pi pi-arrow-down-right" style="font-size:12px;"></i>
                Kutish ~{{ r.benefit['wait_reduction_min'] }} daq kamayadi ({{ r.benefit['wait_before_min'] }} → {{ r.benefit['wait_after_min'] }} daq)
              </p>
            } @else if (r.benefit['freed_counters'] != null) {
              <p class="flex items-center gap-1.5" style="margin:8px 0 0;font-size:12px;font-weight:600;color:var(--ok);">
                <i class="pi pi-arrow-down-right" style="font-size:12px;"></i>
                {{ r.benefit['freed_counters'] }} ta kassa bo'shaydi
              </p>
            }

            @if (r.status === 'proposed') {
              <div class="flex gap-2" style="margin-top:12px;">
                <button
                  class="sq-btn flex flex-1 items-center justify-center gap-1.5"
                  style="height:36px;border:none;border-radius:10px;cursor:pointer;font-family:var(--font-sans,'Sora');font-weight:600;font-size:12.5px;color:var(--ok-ink);background:linear-gradient(100deg,var(--accent-a),var(--accent-b));box-shadow:0 8px 22px -10px rgba(var(--a-rgb),.7);"
                  (click)="decide(r, 'accepted')"
                >
                  <i class="pi pi-check" style="font-size:12px;"></i>Qabul
                </button>
                <button
                  class="sq-mini flex flex-1 items-center justify-center gap-1.5"
                  style="height:36px;border:1px solid var(--chip-bd);border-radius:10px;cursor:pointer;font-family:var(--font-sans,'Sora');font-weight:600;font-size:12.5px;color:var(--text-dim);background:var(--chip);"
                  (click)="decide(r, 'rejected')"
                >
                  <i class="pi pi-times" style="font-size:12px;"></i>Rad
                </button>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class RecommendationsPanel {
  readonly recommendations = input<Recommendation[]>([]);
  readonly proposedCount = input(0);

  readonly respond = output<RecommendationDecision>();

  decide(rec: Recommendation, status: RecommendationResponse): void {
    this.respond.emit({ recId: rec.recId, status });
  }

  cardStyle(status: RecommendationStatus): string {
    const active = status === 'proposed';
    const bg = active
      ? 'linear-gradient(150deg,rgba(var(--c-rgb),.12),rgba(var(--b-rgb),.06))'
      : 'var(--chip)';
    const bd = active ? 'rgba(var(--c-rgb),.32)' : 'var(--border)';
    const op = active ? '' : 'opacity:.62;';
    return `${op}border-radius:15px;padding:15px;background:${bg};border:1px solid ${bd};`;
  }

  icon(actionType: ActionType): string {
    if (actionType === 'open_counter') return 'pi pi-plus-circle';
    if (actionType === 'close_counter') return 'pi pi-minus-circle';
    if (actionType === 'route_queue') return 'pi pi-directions';
    if (actionType === 'reassign_operator') return 'pi pi-sync';
    return 'pi pi-arrow-right';
  }
}
