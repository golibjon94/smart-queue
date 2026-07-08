using System.Text.Json.Serialization;

namespace SmartQueue.Gateway.Infrastructure.Ml;

// Python ML servisining wire-kontrakti snake_case. C# tomonda PascalCase
// nomlarni saqlab, wire nomini [JsonPropertyName] bilan aniq belgilaymiz.

public sealed record MlServiceState(
    [property: JsonPropertyName("service_type_id")] int ServiceTypeId,
    [property: JsonPropertyName("waiting")] int Waiting,
    [property: JsonPropertyName("open_counters")] int OpenCounters,
    [property: JsonPropertyName("arrivals_per_hour")] double? ArrivalsPerHour);

public sealed record MlCounterState(
    [property: JsonPropertyName("counter_id")] int CounterId,
    [property: JsonPropertyName("number")] int Number,
    [property: JsonPropertyName("status")] string Status,   // serving | idle | closed
    [property: JsonPropertyName("supported_service_types")] int[] SupportedServiceTypes);

public sealed record MlRecommendationRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("services")] IReadOnlyList<MlServiceState> Services,
    // JIQ (Join-the-Idle-Queue) uchun kassa-daraja holati — FAZA1_UMUMIY §5.2.
    [property: JsonPropertyName("counters")] IReadOnlyList<MlCounterState> Counters);

public sealed record MlForecastRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("hours")] int Hours,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId);

// --- Anomaliya (EWMA) — FAZA1_UMUMIY §5.1, §7.3 ---

public sealed record MlAnomalyRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("lookback_hours")] int LookbackHours);

public sealed record MlAnomalyOut(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("severity")] string Severity,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId,
    [property: JsonPropertyName("counter_id")] int? CounterId,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("metric")] double? Metric,
    [property: JsonPropertyName("expected")] double? Expected,
    [property: JsonPropertyName("detected_at")] DateTimeOffset DetectedAt);

public sealed record MlAnomalyResponse(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("anomalies")] IReadOnlyList<MlAnomalyOut> Anomalies);
