using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Feedback;

/// <summary>
/// Feedback orkestratsiyasi (FAZA2_UMUMIY §6): yozishda izohni ML `/classify-feedback`
/// orqali tasniflab saqlaydi, summary'da sentiment taqsimoti + top mavzular + "issiqlik"
/// darajasini jamlaydi. ML tasniflash sinxron (MVP) — xato bo'lsa feedback baribir yoziladi.
/// </summary>
public sealed class FeedbackService(
    FeedbackRepository repository,
    MlClient ml,
    ILogger<FeedbackService> log)
{
    private const int TopTopicsLimit = 8;

    // "Issiqlik" chegaralari: salbiy ulushi shu qiymatlardan oshsa rang o'zgaradi.
    private const double RedThreshold = 0.5;
    private const double YellowThreshold = 0.25;

    public async Task<FeedbackResult> SubmitAsync(FeedbackRequest req, CancellationToken ct = default)
    {
        FeedbackClassification? classification = null;
        if (!string.IsNullOrWhiteSpace(req.Comment))
            classification = await ClassifyAsync(req.Comment, ct);

        var feedbackId = await repository.InsertAsync(
            req.BranchId, req.TicketId, req.Rating, req.Comment, classification, ct);

        return new FeedbackResult(
            feedbackId,
            req.BranchId,
            req.Rating,
            req.Comment,
            classification?.Sentiment,
            classification?.Score,
            classification?.Topics ?? []);
    }

    public async Task<FeedbackSummary> SummaryAsync(
        int branchId, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        var counts = await repository.GetSentimentCountsAsync(branchId, from, to, ct);
        var avgRating = await repository.GetAvgRatingAsync(branchId, from, to, ct);
        var topics = await repository.GetTopTopicsAsync(branchId, from, to, TopTopicsLimit, ct);

        var positive = counts.Where(c => c.Sentiment == "positive").Sum(c => c.Count);
        var negative = counts.Where(c => c.Sentiment == "negative").Sum(c => c.Count);
        // Tasniflanmagan (null sentiment — izohsiz baho) neytral deb sanaladi.
        var neutral = counts.Where(c => c.Sentiment is "neutral" or null).Sum(c => c.Count);
        var total = positive + negative + neutral;

        var distribution = new SentimentDistribution(
            positive, negative, neutral,
            Pct(positive, total), Pct(negative, total), Pct(neutral, total));

        var negativeShare = total > 0 ? (double)negative / total : 0;
        var heat = negativeShare >= RedThreshold ? "red"
            : negativeShare >= YellowThreshold ? "yellow"
            : "green";

        return new FeedbackSummary(
            branchId,
            total,
            Math.Round(avgRating, 2),
            distribution,
            topics,
            Math.Round(negativeShare, 3),
            heat,
            from,
            to);
    }

    private async Task<FeedbackClassification?> ClassifyAsync(string comment, CancellationToken ct)
    {
        try
        {
            var resp = await ml.ClassifyFeedbackAsync([comment], ct);
            var r = resp?.Results.FirstOrDefault();
            if (r is not null)
                return new FeedbackClassification(r.Sentiment, r.Score, [.. r.Topics]);
        }
        catch (Exception ex)
        {
            // ML ishlamasa feedback baribir saqlanadi (tasnif keyin to'ldirilishi mumkin).
            log.LogWarning(ex, "Sentiment tasniflash muvaffaqiyatsiz — feedback tasnifisiz saqlanadi");
        }
        return null;
    }

    private static double Pct(int part, int total) =>
        total > 0 ? Math.Round(100.0 * part / total, 1) : 0;
}
