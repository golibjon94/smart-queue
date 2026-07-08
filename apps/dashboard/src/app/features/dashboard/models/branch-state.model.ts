// Gateway /api/queue-state javobi (camelCase — .NET System.Text.Json web defaults).
// Bu shakl to'g'ridan-to'g'ri view-model sifatida ishlatiladi.

export type CounterStatus = 'serving' | 'idle' | 'closed';

export interface CounterState {
  counterId: number;
  number: number;
  name: string | null;
  isOpen: boolean;
  status: CounterStatus;
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

export type ScenarioName = 'normal' | 'lunch_peak' | (string & {});

export interface BranchState {
  branchId: number;
  branchName: string;
  scenario: ScenarioName;
  updatedAt: string;
  counters: CounterState[];
  queues: ServiceQueueState[];
  avgWaitMin: number;
  totalWaiting: number;
}
