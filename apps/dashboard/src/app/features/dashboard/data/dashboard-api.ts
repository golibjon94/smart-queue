import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { VirtualTicketRow } from '../../virtual-queue/models/vq.model';
import {
  ActionType,
  AnomaliesResponseDto,
  Anomaly,
  BranchState,
  FeedbackResult,
  FeedbackSummary,
  Forecast,
  ForecastResponseDto,
  Recommendation,
  RecommendationPayload,
  RecommendationRefreshDto,
  RecommendationRefreshItemDto,
  RecommendationResponse,
  RecommendationRowDto,
  ScenarioName,
  SimulateRequest,
  SimulateResult,
} from '../models';

// Stateless data-access qatlami: HTTP chaqiruvlar va DTO -> view-model mapping.
// Auth (Bearer) header authInterceptor tomonidan avtomatik qo'shiladi.
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.gatewayUrl;

  getQueueState(branchId: number): Observable<BranchState> {
    return this.http.get<BranchState>(`${this.base}/api/queue-state`, {
      params: { branchId },
    });
  }

  setScenario(branchId: number, scenario: ScenarioName): Observable<BranchState> {
    return this.http.post<BranchState>(`${this.base}/api/demo/scenario`, { branchId, scenario });
  }

  getForecast(branchId: number, hours: number): Observable<Forecast> {
    return this.http
      .get<ForecastResponseDto>(`${this.base}/api/forecast`, {
        params: { branchId, hours },
      })
      .pipe(map(mapForecast));
  }

  /** Joriy holat bo'yicha ML orqali yangi tavsiyalar yaratish. */
  refreshRecommendations(branchId: number): Observable<Recommendation[]> {
    return this.http
      .post<RecommendationRefreshDto>(
        `${this.base}/api/recommendations/refresh`,
        null,
        { params: { branchId } },
      )
      .pipe(map((res) => (res.recommendations ?? []).map(mapRefreshItem)));
  }

  /** Oldingi tavsiyalar ro'yxati (DB'dan). */
  getRecommendations(branchId: number, status?: string): Observable<Recommendation[]> {
    return this.http
      .get<RecommendationRowDto[]>(`${this.base}/api/recommendations`, {
        params: status ? { branchId, status } : { branchId },
      })
      .pipe(map((rows) => rows.map(mapRow)));
  }

  respond(recId: number, status: RecommendationResponse): Observable<void> {
    // respondedBy yuborilmaydi — Gateway audit uchun foydalanuvchini JWT claim'idan oladi.
    return this.http.post<void>(
      `${this.base}/api/recommendations/${recId}/respond`,
      { status },
    );
  }

  /** Joriy anomaliyalar (boshlang'ich yuklash — keyin SignalR push orqali keladi). */
  getAnomalies(branchId: number): Observable<Anomaly[]> {
    return this.http
      .get<AnomaliesResponseDto | Anomaly[]>(`${this.base}/api/anomalies`, {
        params: { branchId },
      })
      .pipe(map((r) => (Array.isArray(r) ? r : (r.anomalies ?? []))));
  }

  // --- Faza 2 ---

  /** What-if simulyatsiya (side-effektsiz hisob, DB yozuvsiz). */
  simulate(req: SimulateRequest): Observable<SimulateResult> {
    return this.http.post<SimulateResult>(`${this.base}/api/simulate`, req);
  }

  /** Filialning faol virtual (QR) talonlari — menejer ko'rinishi. */
  getVirtualTickets(branchId: number): Observable<VirtualTicketRow[]> {
    return this.http.get<VirtualTicketRow[]>(`${this.base}/api/vq/tickets`, {
      params: { branchId },
    });
  }

  /** Sentiment-feedback jamlanma (taqsimot, top mavzular, "issiqlik"). */
  getFeedbackSummary(branchId: number): Observable<FeedbackSummary> {
    return this.http.get<FeedbackSummary>(`${this.base}/api/feedback/summary`, {
      params: { branchId },
    });
  }

  /** Demo izohi — dashboard'dan baho+izoh yuborish (sentiment jonli ko'rsatish uchun). */
  postFeedback(branchId: number, rating: number, comment: string): Observable<FeedbackResult> {
    return this.http.post<FeedbackResult>(`${this.base}/api/feedback`, {
      branchId,
      rating,
      comment: comment.trim() || null,
    });
  }
}

// --- pure mapping helperlari ---

function mapForecast(dto: ForecastResponseDto): Forecast {
  return {
    branchId: dto.branch_id,
    modelName: dto.model_name,
    modelVersion: dto.model_version,
    points: dto.points.map((p) => ({
      targetTime: p.target_time,
      predicted: p.predicted_arrivals,
      lowerCi: p.lower_ci,
      upperCi: p.upper_ci,
    })),
  };
}

function mapRefreshItem(r: RecommendationRefreshItemDto): Recommendation {
  return {
    recId: r.rec_id,
    actionType: r.action_type,
    action: r.action,
    reason: r.reason,
    benefit: r.expected_benefit ?? {},
    status: r.status,
    generatedAt: r.generated_at,
  };
}

function mapRow(r: RecommendationRowDto): Recommendation {
  return {
    recId: r.recId,
    actionType: r.actionType,
    action: actionLabel(r.actionType, r.actionPayload),
    reason: r.reason,
    benefit: r.expectedBenefit ?? {},
    status: r.status,
    generatedAt: r.generatedAt,
  };
}

function actionLabel(actionType: ActionType, payload: RecommendationPayload | null | undefined): string {
  if (actionType === 'open_counter' && payload?.counter_number != null) {
    return `${payload.counter_number}-kassani oching`;
  }
  if (actionType === 'close_counter') {
    return "Kassani boshqa ishga o'tkazing";
  }
  if (actionType === 'route_queue') {
    const n = payload?.to_counter_number;
    return n != null ? `Navbatni ${n}-kassaga yo'naltiring` : "Navbatni bo'sh kassaga yo'naltiring";
  }
  if (actionType === 'reassign_operator') {
    return 'Operatorni qayta tayinlang';
  }
  return actionType;
}
