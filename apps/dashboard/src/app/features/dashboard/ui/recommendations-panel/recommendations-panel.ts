import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { Recommendation, RecommendationResponse, RecommendationStatus } from '../../models';

export interface RecommendationDecision {
  recId: number;
  status: RecommendationResponse;
}

@Component({
  selector: 'app-recommendations-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ButtonModule, CardModule, TagModule],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between gap-3">
          <span class="text-[15px] font-semibold text-surface-900 dark:text-surface-0">Tavsiyalar</span>
          @if (proposedCount() > 0) {
            <p-tag severity="warn" [value]="proposedCount() + ' faol'" />
          }
        </div>
      </ng-template>

      @if (recommendations().length === 0) {
        <div class="flex items-center gap-2.5 py-2 text-sm text-surface-500 dark:text-surface-400">
          <i class="pi pi-check-circle text-lg text-green-600"></i>
          <span>Hozircha tavsiya yo'q — tizim holatni kuzatmoqda.</span>
        </div>
      }

      <div class="flex flex-col gap-3">
        @for (r of recommendations(); track r.recId) {
          <div
            class="flex items-center justify-between gap-3.5 rounded-xl border px-4 py-3.5"
            [ngClass]="cardClass(r.status)"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-[15px] text-surface-900 dark:text-surface-0">
                <i class="pi pi-arrow-right text-[13px] text-primary-500"></i>
                <strong>{{ r.action }}</strong>
                @if (r.status === 'accepted') {
                  <p-tag severity="success" value="Qabul qilindi" />
                } @else if (r.status === 'rejected') {
                  <p-tag severity="secondary" value="Rad etildi" />
                }
              </div>
              <p class="mb-0.5 mt-1.5 text-[13px] text-surface-500 dark:text-surface-400">{{ r.reason }}</p>
              @if (r.benefit['wait_reduction_min'] != null) {
                <p class="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-green-600">
                  <i class="pi pi-arrow-down-right"></i>
                  Kutish ~{{ r.benefit['wait_reduction_min'] }} daq kamayadi
                  ({{ r.benefit['wait_before_min'] }} → {{ r.benefit['wait_after_min'] }} daq)
                </p>
              } @else if (r.benefit['freed_counters'] != null) {
                <p class="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-green-600">
                  <i class="pi pi-arrow-down-right"></i>
                  {{ r.benefit['freed_counters'] }} ta kassa bo'shaydi
                </p>
              }
            </div>
            @if (r.status === 'proposed') {
              <div class="flex shrink-0 gap-2">
                <p-button
                  icon="pi pi-check" label="Qabul" size="small"
                  severity="success" (onClick)="decide(r, 'accepted')"
                />
                <p-button
                  icon="pi pi-times" label="Rad" size="small"
                  severity="secondary" [outlined]="true" (onClick)="decide(r, 'rejected')"
                />
              </div>
            }
          </div>
        }
      </div>
    </p-card>
  `,
})
export class RecommendationsPanel {
  readonly recommendations = input<Recommendation[]>([]);
  readonly proposedCount = input(0);

  readonly respond = output<RecommendationDecision>();

  decide(rec: Recommendation, status: RecommendationResponse): void {
    this.respond.emit({ recId: rec.recId, status });
  }

  cardClass(status: RecommendationStatus): string {
    return status === 'proposed'
      ? 'border-primary-200 bg-primary-50'
      : 'border-surface-200 bg-surface-100 opacity-70 dark:border-surface-700 dark:bg-surface-800';
  }
}
