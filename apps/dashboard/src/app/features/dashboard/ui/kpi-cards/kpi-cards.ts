import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4' },
  template: `
    <div
      class="flex items-center gap-3.5 rounded-2xl border border-surface-200 bg-surface-0 px-[18px] py-4 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="grid h-[46px] w-[46px] place-items-center rounded-xl bg-blue-50 text-xl text-blue-600">
        <i class="pi pi-users"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-bold leading-tight text-surface-900 dark:text-surface-0">
          {{ totalWaiting() ?? '—' }}
        </span>
        <span class="text-[12.5px] text-surface-500 dark:text-surface-400">Navbatda kutmoqda</span>
      </div>
    </div>

    <div
      class="flex items-center gap-3.5 rounded-2xl border border-surface-200 bg-surface-0 px-[18px] py-4 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="grid h-[46px] w-[46px] place-items-center rounded-xl bg-amber-50 text-xl text-amber-600">
        <i class="pi pi-clock"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-bold leading-tight text-surface-900 dark:text-surface-0">
          ~{{ avgWaitMin() ?? '—' }}
          <small class="text-sm font-medium text-surface-500 dark:text-surface-400">daq</small>
        </span>
        <span class="text-[12.5px] text-surface-500 dark:text-surface-400">O'rtacha kutish</span>
      </div>
    </div>

    <div
      class="flex items-center gap-3.5 rounded-2xl border border-surface-200 bg-surface-0 px-[18px] py-4 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="grid h-[46px] w-[46px] place-items-center rounded-xl bg-green-50 text-xl text-green-600">
        <i class="pi pi-desktop"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-bold leading-tight text-surface-900 dark:text-surface-0">
          {{ openCounters() }}<small class="text-sm font-medium text-surface-500 dark:text-surface-400">/{{ totalCounters() }}</small>
        </span>
        <span class="text-[12.5px] text-surface-500 dark:text-surface-400">Ochiq kassalar</span>
      </div>
    </div>

    <div
      class="flex items-center gap-3.5 rounded-2xl border border-surface-200 bg-surface-0 px-[18px] py-4 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="grid h-[46px] w-[46px] place-items-center rounded-xl bg-violet-50 text-xl text-violet-600">
        <i class="pi pi-bell"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-2xl font-bold leading-tight text-surface-900 dark:text-surface-0">
          {{ proposedCount() }}
        </span>
        <span class="text-[12.5px] text-surface-500 dark:text-surface-400">Faol tavsiyalar</span>
      </div>
    </div>
  `,
})
export class KpiCards {
  readonly totalWaiting = input<number | null>(null);
  readonly avgWaitMin = input<number | null>(null);
  readonly openCounters = input(0);
  readonly totalCounters = input(0);
  readonly proposedCount = input(0);
}
