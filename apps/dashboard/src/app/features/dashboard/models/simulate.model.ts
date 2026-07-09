// What-if simulyatsiya (Gateway POST /api/simulate javobi — camelCase).
// FAZA2_UMUMIY §4 / PROGRESS_GATEWAY wire-format.

export interface SimulateScenarioInput {
  openCounters: number;
  arrivalsPerHour?: number | null;
  avgServiceSec?: number | null;
}

export interface SimulateRequest {
  branchId: number;
  serviceTypeId?: number | null; // null -> filial jami
  scenario: SimulateScenarioInput;
}

/** Bitta holat (baseline yoki scenario) natijasi. */
export interface SimulateSide {
  openCounters: number;
  avgWaitSec: number;
  utilization: number; // 0..1
  probWait: number; // 0..1
}

export interface SimulateDelta {
  waitReductionSec: number;
  waitReductionPct: number;
}

export interface SimulateResult {
  branchId: number;
  serviceTypeId: number | null;
  baseline: SimulateSide;
  scenario: SimulateSide;
  delta: SimulateDelta;
}
