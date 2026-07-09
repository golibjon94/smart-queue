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

// --- Faza 2: What-if simulyatsiya (FAZA2_UMUMIY §4) ---

public sealed record MlSimulateScenarioIn(
    [property: JsonPropertyName("open_counters")] int OpenCounters,
    [property: JsonPropertyName("arrivals_per_hour")] double? ArrivalsPerHour,
    [property: JsonPropertyName("avg_service_sec")] double? AvgServiceSec);

public sealed record MlSimulateRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId,
    [property: JsonPropertyName("scenario")] MlSimulateScenarioIn Scenario);

public sealed record MlSimulateSnapshot(
    [property: JsonPropertyName("open_counters")] int OpenCounters,
    [property: JsonPropertyName("avg_wait_sec")] int AvgWaitSec,
    [property: JsonPropertyName("utilization")] double Utilization,
    [property: JsonPropertyName("prob_wait")] double ProbWait);

public sealed record MlSimulateDelta(
    [property: JsonPropertyName("wait_reduction_sec")] int WaitReductionSec,
    [property: JsonPropertyName("wait_reduction_pct")] int WaitReductionPct);

public sealed record MlSimulateResponse(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId,
    [property: JsonPropertyName("baseline")] MlSimulateSnapshot Baseline,
    [property: JsonPropertyName("scenario")] MlSimulateSnapshot Scenario,
    [property: JsonPropertyName("delta")] MlSimulateDelta Delta);

// --- Faza 2: QR virtual navbat ETA (FAZA2_UMUMIY §5.5) ---

public sealed record MlEtaRequest(
    [property: JsonPropertyName("branch_id")] int BranchId,
    [property: JsonPropertyName("service_type_id")] int? ServiceTypeId,
    [property: JsonPropertyName("position")] int Position,
    [property: JsonPropertyName("open_counters")] int OpenCounters,
    [property: JsonPropertyName("avg_service_sec")] double? AvgServiceSec,
    [property: JsonPropertyName("arrivals_next_hour")] double? ArrivalsNextHour);

public sealed record MlEtaResponse(
    [property: JsonPropertyName("position")] int Position,
    [property: JsonPropertyName("eta_sec")] int EtaSec,
    [property: JsonPropertyName("base_eta_sec")] int BaseEtaSec,
    [property: JsonPropertyName("forecast_factor")] double ForecastFactor);

// --- Faza 2: Sentiment tasniflash (FAZA2_UMUMIY §6.2) ---

public sealed record MlClassifyRequest(
    [property: JsonPropertyName("comments")] IReadOnlyList<string> Comments);

public sealed record MlClassifyResult(
    [property: JsonPropertyName("sentiment")] string Sentiment,
    [property: JsonPropertyName("score")] double Score,
    [property: JsonPropertyName("topics")] IReadOnlyList<string> Topics);

public sealed record MlClassifyResponse(
    [property: JsonPropertyName("results")] IReadOnlyList<MlClassifyResult> Results);
