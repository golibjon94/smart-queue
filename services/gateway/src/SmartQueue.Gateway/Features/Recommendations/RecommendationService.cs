using SmartQueue.Gateway.Features.Queue;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Recommendations;

/// <summary>
/// Tavsiya orkestratsiyasi: joriy holatni ML'ga yuborish (refresh), DB'dan
/// ro'yxat va menejer javobini (audit) qayd etish.
/// </summary>
public sealed class RecommendationService(
    DemoStateService demo,
    MlClient ml,
    RecommendationRepository repository)
{
    /// <summary>Joriy navbat holatidan ML orqali yangi tavsiyalar hisoblaydi.</summary>
    public async Task<MlProxyResult> RefreshAsync(int branchId, CancellationToken ct = default)
    {
        var state = await demo.GetStateAsync(branchId, ct);
        var request = new MlRecommendationRequest(
            branchId,
            state.Queues
                .Select(q => new MlServiceState(
                    q.ServiceTypeId, q.Waiting, q.OpenCounters, q.ArrivalsPerHour))
                .ToList());

        return await ml.RecommendationsAsync(request, ct);
    }

    public Task<IReadOnlyList<RecommendationRow>> ListAsync(
        int branchId, string? status, CancellationToken ct = default) =>
        repository.ListAsync(branchId, status, ct);

    public Task<bool> RespondAsync(
        long recId, string status, int? respondedBy, CancellationToken ct = default) =>
        repository.RespondAsync(recId, status, respondedBy, ct);
}
