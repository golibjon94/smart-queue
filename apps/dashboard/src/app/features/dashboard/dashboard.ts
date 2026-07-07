import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { MenuItem, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { BRANCH_ID, POLL_INTERVAL_MS } from '../../core/config';
import { BranchState, ForecastResponse, RecView } from '../../core/models';

type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

@Component({
  selector: 'app-dashboard',
  imports: [
    AvatarModule, ButtonModule, CardModule, ChartModule,
    MenuModule, TableModule, TagModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(MessageService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly state = signal<BranchState | null>(null);
  readonly forecast = signal<ForecastResponse | null>(null);
  readonly recs = signal<RecView[]>([]);
  readonly connectionError = signal(false);

  readonly user = this.auth.user;
  readonly userMenu: MenuItem[] = [
    { label: this.auth.user()?.fullName ?? 'Foydalanuvchi', disabled: true },
    { separator: true },
    { label: 'Chiqish', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];

  readonly isPeak = computed(() => this.state()?.scenario === 'lunch_peak');
  readonly openCounters = computed(
    () => this.state()?.counters.filter((c) => c.isOpen).length ?? 0);
  readonly totalCounters = computed(() => this.state()?.counters.length ?? 0);
  readonly proposedCount = computed(
    () => this.recs().filter((r) => r.status === 'proposed').length);

  readonly chartData = computed(() => {
    const f = this.forecast();
    if (!f) return null;
    const fmt = new Intl.DateTimeFormat('uz', {
      weekday: 'short', hour: '2-digit', timeZone: 'Asia/Tashkent',
    });
    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue('--p-primary-500').trim() || '#3b82f6';
    return {
      labels: f.points.map((p) => fmt.format(new Date(p.target_time))),
      datasets: [
        {
          label: 'Yuqori chegara',
          data: f.points.map((p) => p.upper_ci),
          borderColor: 'transparent',
          backgroundColor: 'rgba(59,130,246,0.10)',
          pointRadius: 0,
          fill: '+1',
          tension: 0.35,
        },
        {
          label: 'Quyi chegara',
          data: f.points.map((p) => p.lower_ci),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
        {
          label: 'Bashorat (mijoz/soat)',
          data: f.points.map((p) => p.predicted_arrivals),
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
        filter: (item: any) => item.datasetIndex === 2,
        callbacks: {
          label: (ctx: any) => ` Bashorat: ${Math.round(ctx.parsed.y)} mijoz/soat`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
    },
  };

  ngOnInit(): void {
    this.loadState();
    this.loadForecast();
    this.loadRecommendations();
    this.pollTimer = setInterval(() => this.loadState(), POLL_INTERVAL_MS);
  }

  toggleScenario(): void {
    const next = this.isPeak() ? 'normal' : 'lunch_peak';
    this.api.setScenario(BRANCH_ID, next).subscribe((s) => {
      this.state.set(s);
      if (next === 'lunch_peak') {
        this.api.refreshRecommendations(BRANCH_ID).subscribe((fresh) => {
          this.recs.update((old) => this.mergeRecs(fresh, old));
          if (fresh.length) {
            this.toast.add({
              severity: 'info',
              summary: 'Yangi tavsiya',
              detail: `${fresh.length} ta harakat taklif qilindi`,
              life: 4000,
            });
          }
        });
      } else {
        this.toast.add({ severity: 'success', summary: 'Normal holat tiklandi', life: 2500 });
      }
    });
  }

  respond(rec: RecView, status: 'accepted' | 'rejected'): void {
    this.api.respond(rec.recId, status).subscribe(() => {
      this.recs.update((list) =>
        list.map((r) => (r.recId === rec.recId ? { ...r, status } : r)));
      this.toast.add({
        severity: status === 'accepted' ? 'success' : 'secondary',
        summary: status === 'accepted' ? 'Tavsiya qabul qilindi' : 'Tavsiya rad etildi',
        detail: rec.action,
        life: 3000,
      });
    });
  }

  // --- Severity helperlar ---
  waitSeverity(min: number): Severity {
    if (min > 10) return 'danger';
    if (min > 5) return 'warn';
    return 'success';
  }

  counterSeverity(status: string): Severity {
    return status === 'serving' ? 'info' : status === 'idle' ? 'secondary' : 'secondary';
  }

  counterLabel(status: string): string {
    return status === 'serving' ? 'xizmatda' : status === 'idle' ? "bo'sh" : 'yopiq';
  }

  private mergeRecs(fresh: RecView[], old: RecView[]): RecView[] {
    const ids = new Set(fresh.map((r) => r.recId));
    return [...fresh, ...old.filter((r) => !ids.has(r.recId))].slice(0, 10);
  }

  private loadState(): void {
    this.api.getQueueState(BRANCH_ID).subscribe({
      next: (s) => {
        this.state.set(s);
        this.connectionError.set(false);
      },
      error: () => this.connectionError.set(true),
    });
  }

  private loadForecast(): void {
    this.api.getForecast(BRANCH_ID, 48).subscribe({
      next: (f) => this.forecast.set(f),
      error: () => {},
    });
  }

  private loadRecommendations(): void {
    this.api.getRecommendations(BRANCH_ID).subscribe({
      next: (rows) => this.recs.set(rows.slice(0, 10)),
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
