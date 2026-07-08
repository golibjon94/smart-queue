// Anomaliya — Gateway `anomalyDetected` push'i va `GET /api/anomalies` (camelCase).
// Manba: FAZA1_UMUMIY §7.3. SignalR to'g'ridan-to'g'ri shu shaklda yuboradi (mapping shart emas).

export type AnomalyType = 'slow_operator' | 'backlog' | 'surge';
export type AnomalySeverity = 'warning' | 'serious' | 'critical';

export interface Anomaly {
  branchId: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  serviceTypeId?: number;
  counterId?: number;
  message: string;
  metric: number;
  expected: number;
  detectedAt: string;
}

// `GET /api/anomalies` javob konverti (Gateway bare massiv ham qaytarishi mumkin).
export interface AnomaliesResponseDto {
  branchId?: number;
  anomalies?: Anomaly[];
}
