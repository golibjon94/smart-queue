import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { CounterState, CounterStatus } from '../../models';

type Severity = 'info' | 'secondary';

@Component({
  selector: 'app-counters-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, CardModule, TagModule],
  template: `
    <p-card>
      <ng-template #title>
        <span class="text-[15px] font-semibold text-surface-900 dark:text-surface-0">
          Kassalar holati
        </span>
      </ng-template>
      <div class="flex flex-wrap gap-2.5">
        @for (c of counters(); track c.counterId) {
          <div
            class="flex w-[82px] flex-col items-center gap-1.5 rounded-[11px] border-[1.5px] py-3"
            [ngClass]="variantClass(c.status)"
          >
            <span class="text-[22px] font-bold text-surface-900 dark:text-surface-0">{{ c.number }}</span>
            <p-tag [severity]="severity(c.status)" [value]="label(c.status)" />
          </div>
        } @empty {
          <span class="text-sm text-surface-500 dark:text-surface-400">Ma'lumot yuklanmoqda...</span>
        }
      </div>
    </p-card>
  `,
})
export class CountersPanel {
  readonly counters = input<CounterState[]>([]);

  severity(status: CounterStatus): Severity {
    return status === 'serving' ? 'info' : 'secondary';
  }

  label(status: CounterStatus): string {
    return status === 'serving' ? 'xizmatda' : status === 'idle' ? "bo'sh" : 'yopiq';
  }

  variantClass(status: CounterStatus): string {
    const base = 'bg-surface-0 dark:bg-surface-900 border-surface-200 dark:border-surface-700';
    if (status === 'serving') return 'border-primary-200 bg-primary-50';
    if (status === 'closed') return `${base} border-dashed opacity-60`;
    return base;
  }
}
