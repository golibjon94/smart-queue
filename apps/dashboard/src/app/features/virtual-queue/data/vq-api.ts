import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { VirtualTicket, VqJoinRequest } from '../models/vq.model';

// Mijoz (public) virtual navbat data-qatlami. Login yo'q — token bilan.
// Endpointlar public: Authorization header bo'lsa ham Gateway [AllowAnonymous] qabul qiladi.
@Injectable({ providedIn: 'root' })
export class VqApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.gatewayUrl;

  /** Yangi virtual talon oladi. */
  join(req: VqJoinRequest): Observable<VirtualTicket> {
    return this.http.post<VirtualTicket>(`${this.base}/api/vq/join`, req);
  }

  /** Joriy holat (boshlang'ich yuklash — keyin SignalR push orqali keladi). */
  status(token: string): Observable<VirtualTicket> {
    return this.http.get<VirtualTicket>(`${this.base}/api/vq/status/${token}`);
  }

  /** Navbatdan chiqish -> abandoned. */
  leave(token: string): Observable<VirtualTicket> {
    return this.http.post<VirtualTicket>(`${this.base}/api/vq/leave/${token}`, null);
  }

  /** Xizmatdan keyin baho + izoh (public). Mijoz natijani kutmaydi. */
  submitFeedback(branchId: number, rating: number, comment: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/api/feedback`, {
      branchId,
      rating,
      comment: comment.trim() || null,
    });
  }
}
