using System.Text.Json;
using SmartQueue.Gateway.Features.Queue;
using SmartQueue.Gateway.Features.Realtime;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Recommendations;

/// <summary>
/// Tavsiya orkestratsiyasi: joriy holatni ML'ga yuborish (refresh), DB'dan
/// ro'yxat va menejer javobini (audit) qayd etish. Refresh JIQ uchun kassa-daraja
/// holatini ham yuboradi va yangi tavsiyalarni SignalR'ga push qiladi.
/// </summary>
public sealed class RecommendationService(
    DemoStateService demo,
    MlClient ml,
    RecommendationRepository repository,
    IRealtimeNotifier notifier,
    ILogger<RecommendationService> log)
{
    /// <summary>Joriy navbat holatidan ML orqali yangi tavsiyalar hisoblaydi (JIQ bilan).</summary>
    public async Task<MlProxyResult> RefreshAsync(int branchId, CancellationToken ct = default)
    {
        var state = await demo.GetStateAsync(branchId, ct);
        var request = new MlRecommendationRequest(
            branchId,
            state.Queues
                .Select(q => new MlServiceState(
                    q.ServiceTypeId, q.Waiting, q.OpenCounters, q.ArrivalsPerHour))
                .ToList(),
            // JIQ (route_queue) uchun kassa-daraja holati — FAZA1_UMUMIY §5.2.
            state.Counters
                .Select(c => new MlCounterState(
                    c.CounterId, c.Number, c.Status, c.SupportedServiceTypes))
                .ToList());

        var result = await ml.RecommendationsAsync(request, ct);

        if (result.StatusCode is >= 200 and < 300)
            await PushRecommendationsAsync(branchId, result.Body, ct);

        return result;
    }

    public Task<IReadOnlyList<RecommendationRow>> ListAsync(
        int branchId, string? status, CancellationToken ct = default) =>
        repository.ListAsync(branchId, status, ct);

    public Task<bool> RespondAsync(
        long recId, string status, int? respondedBy, CancellationToken ct = default) =>
        repository.RespondAsync(recId, status, respondedBy, ct);

    // ML passthrough javobini (snake_case) o'qib, har tavsiyani camelCase
    // `recommendationCreated` sifatida push qiladi. Best-effort — push xatosi
    // HTTP javobiga ta'sir qilmaydi.
    private async Task PushRecommendationsAsync(int branchId, string body, CancellationToken ct)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("recommendations", out var recs)
                || recs.ValueKind != JsonValueKind.Array)
                return;

            foreach (var r in recs.EnumerateArray())
            {
                var dto = new RecommendationDto(
                    RecId: r.GetProperty("rec_id").GetInt64(),
                    ActionType: GetString(r, "action_type"),
                    Action: GetString(r, "action"),
                    Reason: GetString(r, "reason"),
                    Benefit: r.TryGetProperty("expected_benefit", out var b)
                        ? b.Clone()
                        : default,
                    Status: GetString(r, "status"),
                    GeneratedAt: GetString(r, "generated_at"));
                await notifier.RecommendationCreatedAsync(branchId, dto, ct);
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Tavsiyalarni SignalR'ga push qilishda xato (branch {BranchId})", branchId);
        }
    }

    private static string GetString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString() ?? ""
            : "";
}
