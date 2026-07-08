import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';

import { Forecast } from '../../models';

@Component({
  selector: 'app-forecast-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, ChartModule],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between gap-3">
          <span class="text-[15px] font-semibold text-surface-900 dark:text-surface-0">
            Kelish oqimi bashorati — {{ hours() }} soat
          </span>
          @if (forecast()?.modelVersion) {
            <span class="inline-flex items-center gap-1.5 text-[11.5px] text-surface-500 dark:text-surface-400">
              <i class="pi pi-microchip-ai"></i> LightGBM v{{ forecast()?.modelVersion }}
            </span>
          }
        </div>
      </ng-template>
      <div class="h-[260px]">
        @if (chartData(); as data) {
          <p-chart type="line" [data]="data" [options]="chartOptions" height="260px" />
        } @else {
          <div class="grid h-[260px] place-items-center text-surface-500 dark:text-surface-400">
            Bashorat yuklanmoqda...
          </div>
        }
      </div>
    </p-card>
  `,
})
export class ForecastChart {
  readonly forecast = input<Forecast | null>(null);
  readonly hours = input(48);

  readonly chartData = computed(() => {
    const f = this.forecast();
    if (!f) return null;

    const fmt = new Intl.DateTimeFormat('uz', {
      weekday: 'short',
      hour: '2-digit',
      timeZone: 'Asia/Tashkent',
    });
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue('--p-primary-500').trim() ||
      '#3b82f6';

    return {
      labels: f.points.map((p) => fmt.format(new Date(p.targetTime))),
      datasets: [
        {
          label: 'Yuqori chegara',
          data: f.points.map((p) => p.upperCi),
          borderColor: 'transparent',
          backgroundColor: 'rgba(59,130,246,0.10)',
          pointRadius: 0,
          fill: '+1',
          tension: 0.35,
        },
        {
          label: 'Quyi chegara',
          data: f.points.map((p) => p.lowerCi),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
        {
          label: 'Bashorat (mijoz/soat)',
          data: f.points.map((p) => p.predicted),
          borderColor: primary,
          backgroundColor: primary,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.35,
        },
      ],
    };
  });

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item: { datasetIndex: number }) => item.datasetIndex === 2,
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            ` Bashorat: ${Math.round(ctx.parsed.y)} mijoz/soat`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  };
}
