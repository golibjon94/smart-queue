using System.Text.Json.Serialization;

namespace SmartQueue.Gateway.Infrastructure.Ml;

// Python ML servisining wire-kontrakti snake_case. C# tomonda PascalCase
// nomlarni saqlab, wire nomini [JsonPropertyName] bilan aniq belgilaymiz.

public sealed record MlServiceState(
    [property: JsonPropertyName("service_type_id")] int ServiceTypeId,
    [property: JsonPropertyName("waiting")] int Waiting,
    [property: JsonPropertyName("open_counters")] int OpenCounters,
    [property: JsonPropertyName("arrivals_per_hour")] double? ArrivalsPerHour);

public sealed record MlRecommendationRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("services")] IReadOnlyList<MlServiceState> Services);

public sealed record MlForecastRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("hours")] int Hours,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId);
