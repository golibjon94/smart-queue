import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/notifications/notification.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { VirtualTicketRow } from '../../virtual-queue/models/vq.model';
import { DashboardApi } from './dashboard-api';
import {
  Anomaly,
  BranchState,
  FeedbackSummary,
  Forecast,
  Recommendation,
  RecommendationResponse,
  ScenarioName,
  SimulateResult,
} from '../models';

const MAX_RECS = 10;
const MAX_ANOMALIES = 8;

/** Anomaliya kompozit kaliti — bir xil (tur + kassa + xizmat) anomaliyani dedup qilish uchun. */
function anomalyKey(a: Anomaly): string {
  return `${a.type}:${a.counterId ?? ''}:${a.serviceTypeId ?? ''}`;
}

/**
 * Dashboard feature holati. Barcha yuklash/real-vaqt/action logikasi shu yerda —
 * komponentlar faqat signal'larni o'qiydi va action chaqiradi.
 *
 * Faza 1: HTTP polling olib tashlandi. Boshlang'ich holat bir martalik HTTP bilan
 * yuklanadi, keyin barcha yangilanishlar `RealtimeService` (SignalR) push'i orqali keladi.
 * Feature-scoped — store va uning hub ulanishi route hayotiy sikliga bog'langan.
 */
@Injectable()
export class DashboardStore {
  private readonly api = inject(DashboardApi);
  private readonly realtime = inject(RealtimeService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly branchId = environment.branchId;

  // Bir marta SignalR ulanganini kuzatadi (uzilishni faqat shundan keyin xato deb belgilash uchun).
  private _hasConnected = false;

  // --- xom holat (writable) ---
  private readonly _state = signal<BranchState | null>(null);
  private readonly _forecast = signal<Forecast | null>(null);
  private readonly _recs = signal<Recommendation[]>([]);
  private readonly _anomalies = signal<Anomaly[]>([]);
  private readonly _connectionError = signal(false);
  private readonly _scenarioLoading = signal(false);

  // Faza 2
  private readonly _simulation = signal<SimulateResult | null>(null);
  private readonly _simulationLoading = signal(false);
  private readonly _virtualTickets = signal<VirtualTicketRow[]>([]);
  private readonly _feedback = signal<FeedbackSummary | null>(null);
  private readonly _feedbackLoading = signal(false);

  // --- public readonly ---
  readonly state = this._state.asReadonly();
  readonly forecast = this._forecast.asReadonly();
  readonly recommendations = this._recs.asReadonly();
  readonly anomalies = this._anomalies.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();
  readonly scenarioLoading = this._scenarioLoading.asReadonly();
  readonly simulation = this._simulation.asReadonly();
  readonly simulationLoading = this._simulationLoading.asReadonly();
  readonly virtualTickets = this._virtualTickets.asReadonly();
  readonly feedback = this._feedback.asReadonly();
  readonly feedbackLoading = this._feedbackLoading.asReadonly();

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
    // Boshlang'ich yuklash (bir martalik HTTP)
    this.loadInitialState();
    this.loadForecast();
    this.loadRecommendations();
    this.loadAnomalies();
    this.loadVirtualTickets();
    this.loadFeedbackSummary();

    // Real-vaqt ulanish + hub signallariga reaksiya
    void this.realtime.connect(this.branchId);
    this.bindRealtime();

    this.destroyRef.onDestroy(() => void this.realtime.disconnect(this.branchId));
  }

  // --- actions ---

  /** Demo ssenariysini almashtiradi. Yangilanish/tavsiyalar hub push orqali ham keladi. */
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
          this.notify.error("Ssenariyni almashtirib bo'lmadi");
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

  // --- Faza 2 actions ---

  /** What-if: slayderdagi kassa soni bo'yicha ssenariyni qayta hisoblaydi (debounce komponentda). */
  simulate(openCounters: number, serviceTypeId?: number | null): void {
    this._simulationLoading.set(true);
    this.api
      .simulate({
        branchId: this.branchId,
        serviceTypeId: serviceTypeId ?? null,
        scenario: { openCounters },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._simulation.set(res);
          this._simulationLoading.set(false);
        },
        error: () => this._simulationLoading.set(false),
      });
  }

  /** Demo izohi yuboradi va jamlanmani qayta yuklaydi (panel jonli "qizil"ga o'tishi uchun). */
  submitFeedback(rating: number, comment: string): void {
    this._feedbackLoading.set(true);
    this.api
      .postFeedback(this.branchId, rating, comment)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.sentiment === 'negative') {
            this.notify.warn('Salbiy izoh qabul qilindi', res.topics?.join(', ') || undefined);
          } else if (res.sentiment === 'positive') {
            this.notify.success('Ijobiy izoh qabul qilindi');
          } else {
            this.notify.info('Izoh qabul qilindi');
          }
          this.loadFeedbackSummary();
        },
        error: () => {
          this._feedbackLoading.set(false);
          this.notify.error("Izohni yuborib bo'lmadi");
        },
      });
  }

  /** Menejer: virtual talonlar ro'yxatini qayta yuklaydi. */
  refreshVirtualTickets(): void {
    this.loadVirtualTickets();
  }

  // --- real-vaqt bog'lash ---

  private bindRealtime(): void {
    // queue holati — push kelganda almashtiriladi
    effect(() => {
      const s = this.realtime.queueState();
      if (s) {
        this._state.set(s);
        this._connectionError.set(false);
      }
    });

    // yangi tavsiya — ro'yxatga qo'shiladi (dedup). untracked — _recs o'qishi effect
    // bog'liqligiga aylanib ketmasligi (cheksiz sikl) uchun.
    effect(() => {
      const rec = this.realtime.recommendation();
      if (rec) {
        untracked(() => this._recs.update((old) => this.mergeRecs([rec], old)));
      }
    });

    // yangi anomaliya — kompozit kalit bo'yicha dedup (bir xil anomaliya har push'da
    // qayta qo'shilmaydi): mavjudini eng yangisi bilan almashtiradi. Toast faqat
    // haqiqatan yangi anomaliyada (aks holda takroriy push toast spamiga olib keladi).
    effect(() => {
      const anomaly = this.realtime.anomaly();
      if (!anomaly) return;
      untracked(() => {
        const key = anomalyKey(anomaly);
        const isNew = !this._anomalies().some((a) => anomalyKey(a) === key);
        this._anomalies.update((old) => {
          const rest = old.filter((a) => anomalyKey(a) !== key);
          return [anomaly, ...rest].slice(0, MAX_ANOMALIES);
        });
        if (isNew) this.notify.warn('Anomaliya aniqlandi', anomaly.message);
      });
    });

    // SignalR jonli holatini connectionError'ga bog'lash: bir marta ulangandan keyin
    // uzilsa "Aloqa yo'q" ko'rsatiladi (dastlabki ulanish/retry paytida bezovta qilmaydi).
    effect(() => {
      const connected = this.realtime.connected();
      untracked(() => {
        if (connected) {
          this._hasConnected = true;
          this._connectionError.set(false);
        } else if (this._hasConnected) {
          this._connectionError.set(true);
        }
      });
    });
  }

  // --- internal loaders (bir martalik HTTP) ---

  private loadInitialState(): void {
    this.api
      .getQueueState(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this._state.set(s);
          this._connectionError.set(false);
        },
        error: () => this._connectionError.set(true),
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

  private loadAnomalies(): void {
    this.api
      .getAnomalies(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this._anomalies.set(list.slice(0, MAX_ANOMALIES)),
        error: () => {},
      });
  }

  private loadVirtualTickets(): void {
    this.api
      .getVirtualTickets(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this._virtualTickets.set(rows),
        error: () => {},
      });
  }

  private loadFeedbackSummary(): void {
    this._feedbackLoading.set(true);
    this.api
      .getFeedbackSummary(this.branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this._feedback.set(s);
          this._feedbackLoading.set(false);
        },
        error: () => this._feedbackLoading.set(false),
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
