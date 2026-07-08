namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>SignalR server→client hodisa nomlari (FAZA1_UMUMIY §4).</summary>
public static class RealtimeEvents
{
    public const string QueueStateUpdated = "queueStateUpdated";
    public const string RecommendationCreated = "recommendationCreated";
    public const string AnomalyDetected = "anomalyDetected";
}
