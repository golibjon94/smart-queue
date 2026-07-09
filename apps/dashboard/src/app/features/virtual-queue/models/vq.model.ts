// Virtual (QR) navbat talonlari (Gateway /api/vq/* — camelCase).
// FAZA2_UMUMIY §5 / PROGRESS_GATEWAY wire-format. Public (token bilan, login yo'q).

export type VqStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'abandoned';

/** /api/vq/join · /status/{token} · /leave/{token} javobi va SignalR `vqPositionUpdated` payload'i. */
export interface VirtualTicket {
  token: string;
  ticketNumber: string;
  branchId: number;
  serviceTypeId: number;
  position: number;
  etaSec: number;
  status: VqStatus;
}

export interface VqJoinRequest {
  branchId: number;
  serviceTypeId: number;
}

/** Menejer ko'rinishi — GET /api/vq/tickets?branchId= (JWT). */
export interface VirtualTicketRow {
  token: string;
  ticketNumber: string;
  branchId: number;
  serviceTypeId: number;
  status: VqStatus;
  joinedAt: string;
}
