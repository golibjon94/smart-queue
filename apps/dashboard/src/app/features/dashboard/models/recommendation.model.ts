// Tavsiyalar ikkita manbadan keladi:
//  - /recommendations/refresh  -> ML javobi (snake_case)
//  - /recommendations          -> DB ro'yxati (camelCase)
// Ikkalasi ham yagona `Recommendation` view-modelga keltiriladi.

export type RecommendationStatus = 'proposed' | 'accepted' | 'rejected' | 'expired';
export type RecommendationResponse = 'accepted' | 'rejected';

// FAZA1_UMUMIY §7.2 — route_queue (JIQ) va reassign_operator qo'shildi.
export type ActionType =
  | 'open_counter'
  | 'close_counter'
  | 'route_queue'
  | 'reassign_operator'
  | (string & {});

// DB row'da saqlanadigan payload (ML JSON blob — snake_case). Turlar bo'yicha ixtiyoriy.
export interface RecommendationPayload {
  counter_number?: number; // open_counter
  service_type_id?: number; // route_queue
  to_counter_id?: number; // route_queue
  to_counter_number?: number; // route_queue
}

export interface RecommendationBenefit {
  wait_reduction_min?: number;
  wait_before_min?: number;
  wait_after_min?: number;
  freed_counters?: number;
  [key: string]: number | undefined;
}

// ML refresh DTO (snake_case)
export interface RecommendationRefreshItemDto {
  rec_id: number;
  action_type: string;
  action: string;
  reason: string;
  expected_benefit?: RecommendationBenefit;
  status: RecommendationStatus;
  generated_at: string;
}

export interface RecommendationRefreshDto {
  recommendations?: RecommendationRefreshItemDto[];
}

// DB ro'yxati DTO (camelCase)
export interface RecommendationRowDto {
  recId: number;
  actionType: ActionType;
  actionPayload?: RecommendationPayload | null;
  reason: string;
  expectedBenefit?: RecommendationBenefit;
  status: RecommendationStatus;
  generatedAt: string;
}

// --- App view-model ---

export interface Recommendation {
  recId: number;
  actionType: ActionType;
  action: string;
  reason: string;
  benefit: RecommendationBenefit;
  status: RecommendationStatus;
  generatedAt: string;
}
