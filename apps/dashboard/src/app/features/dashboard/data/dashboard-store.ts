import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/notifications/notification.service';
import { DashboardApi } from './dashboard-api';
import {
  BranchState,
  Forecast,
  Recommendation,
  RecommendationResponse,
  ScenarioName,
} from '../models';

const MAX_RECS = 10;

/**
 * Dashboard feature holati. Barcha yuklash/polling/action logikasi shu yerda —
 * komponentlar faqat signal'larni o'qiydi va action chaqiradi.
 * Feature-scoped (Dashboard komponentining `providers` da beriladi), shuning uchun
 * store va uning polling'i route hayotiy sikliga bog'langan.
 */
@Injectable()
export class DashboardStore {
  private readonly api = inject(DashboardApi);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly branchId = environment.branchId;

  // --- xom holat (writable) ---
  private readonly _state = signal<BranchState | null>(null);
  private readonly _forecast = signal<Forecast | null>(null);
  private readonly _recs = signal<Recommendation[]>([]);
  private readonly _connectionError = signal(false);
  private readonly _scenarioLoading = signal(false);

  // --- public readonly ---
  readonly state = this._state.asReadonly();
  readonly forecast = this._forecast.asReadonly();
  readonly recommendations = this._recs.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();
  readonly scenarioLoading = this._scenarioLoading.asReadonly();

  // --- derived ---
  readonly branchName = computed(() => this._state()?.branchName ?? null);
  readonly isPeak = computed(() => this._state()?.scenario === 'lunch_peak');
  readonly openCounters = computed(
    () => this._state()?.counters.filter((c) => c.isOpen).length ?? 0,
  );
  readonly totalCounters = computed(() => this._state()?.counters.length ?? 0);
  readonly proposedCount = computed(
    () => this._recs().filter((r) => r.status === 'proposed').length,
  );

  constructor() {
    this.startPolling();
    this.loadForecast();
    this.loadRecommendations();
  }

  // --- actions ---

  /** Demo ssenariysini almashtiradi va cho'qqi holatida yangi tavsiyalar so'raydi. */
  toggleScenario(): void {
    const next: ScenarioName = this.isPeak() ? 'normal' : 'lunch_peak';
    this._scenarioLoading.set(true);

    this.api
      .setScenario(this.branchId, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this._state.set(s);
          if (next === 'lunch_peak') {
            this.refreshRecommendations();
          } else {
            this._scenarioLoading.set(false);
            this.notify.success('Normal holat tiklandi');
          }
        },
        error: () => {
          this._scenarioLoading.set(false);
          this.notify.error('Ssenariyni almashtirib bo\'lmadi');
        },
      });
  }

  respond(recId: number, status: RecommendationResponse): void {
    const rec = this._recs().find((r) => r.recId === recId);
    this.api
      .respond(recId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._recs.update((list) =>
          list.map((r) => (r.recId === recId ? { ...r, status } : r)),
        );
        if (status === 'accepted') {
          this.notify.success('Tavsiya qabul qilindi', rec?.action);
        } else {
          this.notify.muted('Tavsiya rad etildi', rec?.action);
        }
      });
  }

  // --- internal loaders ---

  private startPolling(): void {
    timer(0, environment.pollIntervalMs)
      .pipe(
        switchMap(() =>
          this.api.getQueueState(this.branchId).pipe(
            catchError(() => {
              this._connectionError.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((s) => {
        this._state.set(s);
        this._connectionError.set(false);
      });
  }

  private loadForecast(): void {
    this.api
      .getForecast(this.branchId, environment.forecastHours)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (f) => this._forecast.set(f), error: () => {} });
  }

  private loadRecommendations(): void {
    this.api
      .getRecommendations(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this._recs.set(rows.slice(0, MAX_RECS)),
        error: () => {},
      });
  }

  private refreshRecommendations(): void {
    this.api
      .refreshRecommendations(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => {
          this._recs.update((old) => this.mergeRecs(fresh, old));
          this._scenarioLoading.set(false);
          if (fresh.length) {
            this.notify.info('Yangi tavsiya', `${fresh.length} ta harakat taklif qilindi`);
          }
        },
        error: () => this._scenarioLoading.set(false),
      });
  }

  private mergeRecs(fresh: Recommendation[], old: Recommendation[]): Recommendation[] {
    const ids = new Set(fresh.map((r) => r.recId));
    return [...fresh, ...old.filter((r) => !ids.has(r.recId))].slice(0, MAX_RECS);
  }
}
