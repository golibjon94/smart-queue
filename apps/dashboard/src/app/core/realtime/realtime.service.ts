import { Injectable, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Anomaly, BranchState, Recommendation } from '../../features/dashboard/models';

const HUB_PATH = '/hubs/queue'; // FAZA1_UMUMIY §4
const RETRY_INTERVAL_MS = 15_000; // hub hali tayyor bo'lmasa, sekin qayta urinish

/**
 * Gateway SignalR hub'iga real-vaqt ulanish. Hub hodisalari (camelCase payload)
 * signal'larga o'tkaziladi — zoneless + OnPush bilan to'liq mos (signal write o'zi
 * change detection'ni ishga tushiradi, hub callback'i "zona"dan tashqarida bo'lsa ham).
 *
 * Qayta ulanish ikki bosqichda:
 *  - `withAutomaticReconnect` — o'rnatilgan ulanish uzilsa.
 *  - `startWithRetry` — dastlabki `start()` muvaffaqiyatsiz bo'lsa (hub hali ko'tarilmagan).
 *
 * Layerlash: bu core-servis dashboard domen shakllarini (BranchState/Recommendation/
 * Anomaly) qayta ishlatadi — ular hub kontraktining ma'lumot shakllari.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private connection?: HubConnection;
  private joinedBranchId?: number;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  // Har hodisa "eng oxirgi" qiymatni ushlaydi; store effect orqali reaksiya bildiradi.
  private readonly _queueState = signal<BranchState | null>(null);
  private readonly _recommendation = signal<Recommendation | null>(null);
  private readonly _anomaly = signal<Anomaly | null>(null);
  private readonly _connected = signal(false);

  readonly queueState = this._queueState.asReadonly();
  readonly recommendation = this._recommendation.asReadonly();
  readonly anomaly = this._anomaly.asReadonly();
  readonly connected = this._connected.asReadonly();

  /** Hub'ga ulanib, filial guruhiga qo'shiladi. Qayta chaqirish xavfsiz. */
  async connect(branchId: number): Promise<void> {
    this.disposed = false;
    this.joinedBranchId = branchId;
    if (this.connection) {
      await this.joinBranch(branchId);
      return;
    }
    this.buildConnection();
    await this.startWithRetry();
  }

  async disconnect(branchId: number): Promise<void> {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const connection = this.connection;
    this.connection = undefined;
    this._connected.set(false);
    if (!connection) return;
    try {
      if (connection.state === HubConnectionState.Connected) {
        await connection.invoke('LeaveBranch', branchId);
      }
    } catch {
      /* ignore */
    }
    await connection.stop();
  }

  private buildConnection(): void {
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.gatewayUrl}${HUB_PATH}`, {
        accessTokenFactory: () => this.auth.token ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('queueStateUpdated', (s: BranchState) => this._queueState.set(s));
    connection.on('recommendationCreated', (r: Recommendation) => this._recommendation.set(r));
    connection.on('anomalyDetected', (a: Anomaly) => this._anomaly.set(a));

    connection.onreconnecting(() => this._connected.set(false));
    connection.onreconnected(() => {
      this._connected.set(true);
      void this.joinBranch(this.joinedBranchId);
    });
    connection.onclose(() => this._connected.set(false));

    this.connection = connection;
  }

  private async startWithRetry(): Promise<void> {
    if (this.disposed || !this.connection) return;
    try {
      await this.connection.start();
      this._connected.set(true);
      await this.joinBranch(this.joinedBranchId);
    } catch {
      // Hub hali tayyor bo'lmasligi mumkin (Gateway parallel ishlanmoqda) — sekin qayta urin.
      this._connected.set(false);
      if (!this.disposed) {
        this.retryTimer = setTimeout(() => void this.startWithRetry(), RETRY_INTERVAL_MS);
      }
    }
  }

  private async joinBranch(branchId?: number): Promise<void> {
    if (branchId == null || this.connection?.state !== HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('JoinBranch', branchId);
    } catch {
      /* ignore */
    }
  }
}
