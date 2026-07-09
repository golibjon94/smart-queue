namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>SignalR server→client hodisa nomlari (FAZA1_UMUMIY §4).</summary>
public static class RealtimeEvents
{
    public const string QueueStateUpdated = "queueStateUpdated";
    public const string RecommendationCreated = "recommendationCreated";
    public const string AnomalyDetected = "anomalyDetected";

    // Faza 2: QR virtual navbat — mijoz sahifasiga pozitsiya/ETA push (§5.4).
    public const string VqPositionUpdated = "vqPositionUpdated";
}
