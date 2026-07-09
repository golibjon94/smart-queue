namespace SmartQueue.Gateway.Features.Feedback;

// Sentiment-feedback (FAZA2_UMUMIY §6). Javoblar camelCase.

// --- So'rov (mijoz → Gateway, public/token) ---

public sealed record FeedbackRequest(
    int BranchId,
    long? TicketId,
    int Rating,             // 1..5
    string? Comment);       // o'zbekcha ochiq matn (ixtiyoriy)

// --- Javob: yaratilgan feedback (tasnif bilan) ---

public sealed record FeedbackResult(
    long FeedbackId,
    int BranchId,
    int Rating,
    string? Comment,
    string? Sentiment,          // positive|negative|neutral (izoh bo'lsa)
    double? SentimentScore,
    IReadOnlyList<string> Topics);

// --- Summary (menejer → Gateway, JWT) ---

public sealed record SentimentDistribution(
    int Positive,
    int Negative,
    int Neutral,
    double PositivePct,
    double NegativePct,
    double NeutralPct);

public sealed record TopicCount(string Topic, int Count);

public sealed record FeedbackSummary(
    int BranchId,
    int Total,
    double AvgRating,
    SentimentDistribution Distribution,
    IReadOnlyList<TopicCount> TopTopics,
    double NegativeShare,       // 0..1
    string Heat,                // green|yellow|red — filial "issiqlik" darajasi
    DateTimeOffset? From,
    DateTimeOffset? To);

// --- Persistence yozuvlari ---

public sealed record FeedbackClassification(string Sentiment, double Score, string[] Topics);

public sealed record SentimentCountRow(string? Sentiment, int Count);
