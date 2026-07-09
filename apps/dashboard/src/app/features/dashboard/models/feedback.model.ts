// Sentiment-feedback (Gateway /api/feedback + /api/feedback/summary — camelCase).
// FAZA2_UMUMIY §6 / PROGRESS_GATEWAY wire-format.

export type Sentiment = 'positive' | 'negative' | 'neutral';
export type HeatLevel = 'green' | 'yellow' | 'red';

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface FeedbackSummary {
  branchId: number;
  total: number;
  avgRating: number;
  distribution: SentimentDistribution;
  topTopics: TopicCount[];
  negativeShare: number; // 0..1
  heat: HeatLevel;
  from: string | null;
  to: string | null;
}

export interface FeedbackRequest {
  branchId: number;
  ticketId?: number | null;
  rating: number; // 1..5
  comment?: string | null;
}

export interface FeedbackResult {
  feedbackId: number;
  branchId: number;
  rating: number;
  comment: string | null;
  sentiment: Sentiment | null;
  sentimentScore: number | null;
  topics: string[];
}
