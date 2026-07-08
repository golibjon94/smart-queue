namespace SmartQueue.Gateway.Features.Anomalies;

/// <summary>Anomaliya (Gateway → Frontend, camelCase) — FAZA1_UMUMIY §7.3.</summary>
public sealed record Anomaly(
    int BranchId,
    string Type,                 // slow_operator | backlog | surge
    string Severity,             // warning | serious | critical
    int? ServiceTypeId,
    int? CounterId,
    string Message,
    double? Metric,
    double? Expected,
    DateTimeOffset DetectedAt);
