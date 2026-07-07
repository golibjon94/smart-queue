import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { GATEWAY_URL } from './config';
import { BranchState, ForecastResponse, RecView } from './models';

// Auth (Bearer token) authInterceptor tomonidan avtomatik qo'shiladi.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getQueueState(branchId: number): Observable<BranchState> {
    return this.http.get<BranchState>(`${GATEWAY_URL}/api/queue-state?branchId=${branchId}`);
  }

  setScenario(branchId: number, scenario: string): Observable<BranchState> {
    return this.http.post<BranchState>(`${GATEWAY_URL}/api/demo/scenario`, { branchId, scenario });
  }

  getForecast(branchId: number, hours: number): Observable<ForecastResponse> {
    return this.http.get<ForecastResponse>(
      `${GATEWAY_URL}/api/forecast?branchId=${branchId}&hours=${hours}`);
  }

  /** Joriy holat bo'yicha yangi tavsiyalar yaratish (ML orqali). */
  refreshRecommendations(branchId: number): Observable<RecView[]> {
    return this.http.post<any>(
      `${GATEWAY_URL}/api/recommendations/refresh?branchId=${branchId}`, null,
    ).pipe(map(resp => (resp.recommendations ?? []).map((r: any): RecView => ({
      recId: r.rec_id,
      actionType: r.action_type,
      action: r.action,
      reason: r.reason,
      benefit: r.expected_benefit ?? {},
      status: r.status,
      generatedAt: r.generated_at,
    }))));
  }

  /** Oldingi tavsiyalar ro'yxati (DB'dan). */
  getRecommendations(branchId: number, status?: string): Observable<RecView[]> {
    const q = status ? `&status=${status}` : '';
    return this.http.get<any[]>(
      `${GATEWAY_URL}/api/recommendations?branchId=${branchId}${q}`,
    ).pipe(map(rows => rows.map((r): RecView => ({
      recId: r.recId,
      actionType: r.actionType,
      action: this.actionLabel(r.actionType, r.actionPayload),
      reason: r.reason,
      benefit: r.expectedBenefit ?? {},
      status: r.status,
      generatedAt: r.generatedAt,
    }))));
  }

  respond(recId: number, status: 'accepted' | 'rejected'): Observable<unknown> {
    return this.http.post(
      `${GATEWAY_URL}/api/recommendations/${recId}/respond`, { status, respondedBy: 1 });
  }

  private actionLabel(actionType: string, payload: any): string {
    if (actionType === 'open_counter' && payload?.counter_number != null) {
      return `${payload.counter_number}-kassani oching`;
    }
    if (actionType === 'close_counter') {
      return 'Kassani boshqa ishga o\'tkazing';
    }
    return actionType;
  }
}
