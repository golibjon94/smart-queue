import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { ApiService } from './core/api.service';
import { BRANCH_ID, POLL_INTERVAL_MS } from './core/config';
import { BranchState, ForecastResponse, RecView } from './core/models';
import { ForecastChartComponent } from './features/forecast-chart/forecast-chart.component';
import { QueueStatusComponent } from './features/queue-status/queue-status.component';
import { RecommendationsComponent } from './features/recommendations/recommendations.component';

@Component({
  selector: 'app-root',
  imports: [QueueStatusComponent, ForecastChartComponent, RecommendationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly state = signal<BranchState | null>(null);
  readonly forecast = signal<ForecastResponse | null>(null);
  readonly recs = signal<RecView[]>([]);
  readonly connectionError = signal(false);

  get isPeak(): boolean {
    return this.state()?.scenario === 'lunch_peak';
  }

  ngOnInit(): void {
    this.loadState();
    this.loadForecast();
    this.api.getRecommendations(BRANCH_ID).subscribe({
      next: rows => this.recs.set(rows.slice(0, 8)),
      error: () => {},
    });
    this.pollTimer = setInterval(() => this.loadState(), POLL_INTERVAL_MS);
  }

  toggleScenario(): void {
    const next = this.isPeak ? 'normal' : 'lunch_peak';
    this.api.setScenario(BRANCH_ID, next).subscribe(s => {
      this.state.set(s);
      if (next === 'lunch_peak') {
        // Cho'qqi boshlandi -> tizimdan yangi tavsiyalar so'raymiz
        this.api.refreshRecommendations(BRANCH_ID).subscribe(newRecs => {
          this.recs.update(old => [...newRecs, ...old].slice(0, 8));
        });
      }
    });
  }

  onRespond(ev: { recId: number; status: 'accepted' | 'rejected' }): void {
    this.api.respond(ev.recId, ev.status).subscribe(() => {
      this.recs.update(list =>
        list.map(r => (r.recId === ev.recId ? { ...r, status: ev.status } : r)));
    });
  }

  private loadState(): void {
    this.api.getQueueState(BRANCH_ID).subscribe({
      next: s => {
        this.state.set(s);
        this.connectionError.set(false);
      },
      error: () => this.connectionError.set(true),
    });
  }

  private loadForecast(): void {
    this.api.getForecast(BRANCH_ID, 48).subscribe({
      next: f => this.forecast.set(f),
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
