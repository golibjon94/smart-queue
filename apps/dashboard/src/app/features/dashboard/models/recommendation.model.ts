// Tavsiyalar ikkita manbadan keladi:
//  - /recommendations/refresh  -> ML javobi (snake_case)
//  - /recommendations          -> DB ro'yxati (camelCase)
// Ikkalasi ham yagona `Recommendation` view-modelga keltiriladi.

export type RecommendationStatus = 'proposed' | 'accepted' | 'rejected' | 'expired';
export type RecommendationResponse = 'accepted' | 'rejected';

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
  actionType: string;
  actionPayload?: { counter_number?: number } | null;
  reason: string;
  expectedBenefit?: RecommendationBenefit;
  status: RecommendationStatus;
  generatedAt: string;
}

// --- App view-model ---

export interface Recommendation {
  recId: number;
  actionType: string;
  action: string;
  reason: string;
  benefit: RecommendationBenefit;
  status: RecommendationStatus;
  generatedAt: string;
}
