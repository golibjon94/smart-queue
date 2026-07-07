import {
  AfterViewInit, Component, ElementRef, OnDestroy, effect, input, viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { ForecastResponse } from '../../core/models';

Chart.register(...registerables);

const BLUE = '#2563eb';
const BAND = 'rgba(37, 99, 235, 0.10)';

@Component({
  selector: 'app-forecast-chart',
  template: `
    <section class="panel">
      <h2>
        Kelish oqimi bashorati (48 soat)
        @if (forecast()?.model_version; as v) {
          <span class="model">LightGBM v{{ v }}</span>
        }
      </h2>
      <div class="chart-wrap"><canvas #canvas></canvas></div>
    </section>
  `,
  styles: `
    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
             padding: 16px 18px; }
    h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #374151;
         display: flex; justify-content: space-between; align-items: baseline; }
    .model { font-size: 11px; font-weight: 400; color: #9ca3af; }
    .chart-wrap { height: 260px; }
  `,
})
export class ForecastChartComponent implements AfterViewInit, OnDestroy {
  forecast = input.required<ForecastResponse | null>();

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.forecast();
      if (data && this.chart) this.render(data);
    });
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.datasetIndex === 0
                  ? ` Bashorat: ${(ctx.parsed.y as number).toFixed(0)} mijoz/soat`
                  : '',
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12 } },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { color: '#9ca3af' },
            title: { display: true, text: 'mijoz / soat', color: '#9ca3af' },
          },
        },
      },
    });
    const data = this.forecast();
    if (data) this.render(data);
  }

  private render(data: ForecastResponse): void {
    if (!this.chart) return;
    const fmt = new Intl.DateTimeFormat('uz', {
      weekday: 'short', hour: '2-digit', timeZone: 'Asia/Tashkent',
    });
    this.chart.data.labels = data.points.map(p => fmt.format(new Date(p.target_time)));
    this.chart.data.datasets = [
      {
        label: 'Bashorat',
        data: data.points.map(p => p.predicted_arrivals),
        borderColor: BLUE,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
      },
      {
        label: 'Yuqori chegara',
        data: data.points.map(p => p.upper_ci),
        borderWidth: 0,
        pointRadius: 0,
        fill: '+1',
        backgroundColor: BAND,
        tension: 0.3,
      },
      {
        label: 'Quyi chegara',
        data: data.points.map(p => p.lower_ci),
        borderWidth: 0,
        pointRadius: 0,
        tension: 0.3,
      },
    ];
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
