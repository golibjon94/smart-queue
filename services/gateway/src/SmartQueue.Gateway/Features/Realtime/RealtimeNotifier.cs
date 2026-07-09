using Microsoft.AspNetCore.SignalR;

namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>
/// Boshqa feature'lar SignalR'ga to'g'ridan-to'g'ri bog'lanmasligi uchun push
/// abstraktsiyasi. Payload'lar camelCase serialize qilinadi (SignalR JSON protokoli).
/// </summary>
public interface IRealtimeNotifier
{
    Task QueueStateUpdatedAsync(int branchId, object state, CancellationToken ct = default);
    Task RecommendationCreatedAsync(int branchId, object recommendation, CancellationToken ct = default);
    Task AnomalyDetectedAsync(int branchId, object anomaly, CancellationToken ct = default);

    // Faza 2: virtual talon egasiga (vq-{token} guruhi) pozitsiya/ETA yangilanishi.
    Task VqPositionUpdatedAsync(string token, object payload, CancellationToken ct = default);
}

public sealed class RealtimeNotifier(IHubContext<QueueHub> hub) : IRealtimeNotifier
{
    public Task QueueStateUpdatedAsync(int branchId, object state, CancellationToken ct = default) =>
        Group(branchId).SendAsync(RealtimeEvents.QueueStateUpdated, state, ct);

    public Task RecommendationCreatedAsync(int branchId, object recommendation, CancellationToken ct = default) =>
        Group(branchId).SendAsync(RealtimeEvents.RecommendationCreated, recommendation, ct);

    public Task AnomalyDetectedAsync(int branchId, object anomaly, CancellationToken ct = default) =>
        Group(branchId).SendAsync(RealtimeEvents.AnomalyDetected, anomaly, ct);

    public Task VqPositionUpdatedAsync(string token, object payload, CancellationToken ct = default) =>
        hub.Clients.Group(QueueHub.TicketGroup(token))
            .SendAsync(RealtimeEvents.VqPositionUpdated, payload, ct);

    private IClientProxy Group(int branchId) => hub.Clients.Group(QueueHub.Group(branchId));
}
