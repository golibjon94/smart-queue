using SmartQueue.Gateway.Features.Realtime;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Anomalies;

/// <summary>
/// ML `/anomalies`'ga proxy: snake_case → camelCase moslashtiradi va aniqlangan
/// anomaliyalarni `anomalyDetected` orqali SignalR'ga ham push qiladi.
/// </summary>
public sealed class AnomalyService(MlClient ml, IRealtimeNotifier notifier)
{
    public const int DefaultLookbackHours = 6;

    public async Task<IReadOnlyList<Anomaly>> GetAndPushAsync(
        int branchId, int lookbackHours, CancellationToken ct = default)
    {
        var response = await ml.AnomaliesAsync(branchId, lookbackHours, ct);
        var anomalies = (response?.Anomalies ?? [])
            .Select(Map)
            .ToList();

        foreach (var anomaly in anomalies)
            await notifier.AnomalyDetectedAsync(branchId, anomaly, ct);

        return anomalies;
    }

    private static Anomaly Map(MlAnomalyOut m) => new(
        BranchId: m.BranchId,
        Type: m.Type,
        Severity: m.Severity,
        ServiceTypeId: m.ServiceTypeId,
        CounterId: m.CounterId,
        Message: m.Message,
        Metric: m.Metric,
        Expected: m.Expected,
        DetectedAt: m.DetectedAt);
}
