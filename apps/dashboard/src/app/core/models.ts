// Gateway javob modellari (camelCase — .NET System.Text.Json web defaults)

export interface CounterState {
  counterId: number;
  number: number;
  name: string | null;
  isOpen: boolean;
  status: 'serving' | 'idle' | 'closed';
  supportedServiceTypes: number[];
}

export interface ServiceQueueState {
  serviceTypeId: number;
  name: string;
  waiting: number;
  openCounters: number;
  avgServiceSec: number;
  estWaitMin: number;
  arrivalsPerHour: number | null;
}

export interface BranchState {
  branchId: number;
  branchName: string;
  scenario: string;
  updatedAt: string;
  counters: CounterState[];
  queues: ServiceQueueState[];
  avgWaitMin: number;
  totalWaiting: number;
}

// ML servisdan proxy (snake_case — FastAPI)
export interface ForecastPoint {
  target_time: string;
  predicted_arrivals: number;
  lower_ci: number;
  upper_ci: number;
}

export interface ForecastResponse {
  branch_id: number;
  model_name: string | null;
  model_version: string | null;
  points: ForecastPoint[];
}

// Tavsiya — ikkala manbadan (refresh: snake_case, DB ro'yxati: camelCase)
// yagona ko'rinishga keltiriladi
export interface RecView {
  recId: number;
  actionType: string;
  action: string;
  reason: string;
  benefit: Record<string, number>;
  status: 'proposed' | 'accepted' | 'rejected' | 'expired';
  generatedAt: string;
}
