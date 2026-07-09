import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { environment } from '../../../../environments/environment';
import { VirtualTicket } from '../models/vq.model';

const HUB_PATH = '/hubs/queue'; // Faza 1 hub'i, Faza 2 da kengaytirilgan
const RETRY_INTERVAL_MS = 8_000;

/**
 * Mijoz sahifasi (public) uchun yengil SignalR ulanishi. Manejer `RealtimeService`'idan
 * ALOHIDA — bu login/branch talab qilmaydi, faqat `vq-{token}` guruhiga obuna bo'ladi va
 * `vqPositionUpdated` push'ini kutadi (polling yo'q).
 *
 * Hub'ning ticket metodlari (`JoinTicket`/`LeaveTicket`) public. Token bo'lmagani uchun
 * accessTokenFactory bo'sh string qaytaradi.
 */
@Injectable({ providedIn: 'root' })
export class VqRealtimeService {
  private connection?: HubConnection;
  private joinedToken?: string;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  private readonly _ticket = signal<VirtualTicket | null>(null);
  private readonly _connected = signal(false);

  readonly ticket = this._ticket.asReadonly();
  readonly connected = this._connected.asReadonly();

  /** Token guruhiga ulanadi. Qayta chaqirish xavfsiz. */
  async connect(token: string): Promise<void> {
    this.disposed = false;
    this.joinedToken = token;
    if (this.connection) {
      await this.joinTicket(token);
      return;
    }
    this.buildConnection();
    await this.startWithRetry();
  }

  async disconnect(): Promise<void> {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const connection = this.connection;
    const token = this.joinedToken;
    this.connection = undefined;
    this._connected.set(false);
    if (!connection) return;
    try {
      if (connection.state === HubConnectionState.Connected && token) {
        await connection.invoke('LeaveTicket', token);
      }
    } catch {
      /* ignore */
    }
    await connection.stop();
  }

  private buildConnection(): void {
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.gatewayUrl}${HUB_PATH}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('vqPositionUpdated', (t: VirtualTicket) => {
      // faqat o'z talonimizga tegishli push (guruh bo'yicha keladi, lekin himoya sifatida)
      if (!this.joinedToken || t.token === this.joinedToken) {
        this._ticket.set(t);
      }
    });

    connection.onreconnecting(() => this._connected.set(false));
    connection.onreconnected(() => {
      this._connected.set(true);
      void this.joinTicket(this.joinedToken);
    });
    connection.onclose(() => this._connected.set(false));

    this.connection = connection;
  }

  private async startWithRetry(): Promise<void> {
    if (this.disposed || !this.connection) return;
    try {
      await this.connection.start();
      this._connected.set(true);
      await this.joinTicket(this.joinedToken);
    } catch {
      this._connected.set(false);
      if (!this.disposed) {
        this.retryTimer = setTimeout(() => void this.startWithRetry(), RETRY_INTERVAL_MS);
      }
    }
  }

  private async joinTicket(token?: string): Promise<void> {
    if (!token || this.connection?.state !== HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('JoinTicket', token);
    } catch {
      /* ignore */
    }
  }
}
