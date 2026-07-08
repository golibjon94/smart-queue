using System.Text.Json;

namespace SmartQueue.Gateway.Features.Recommendations;

/// <summary>
/// Menejer javobi. RespondedBy mijoz body'sidan olinmaydi — audit uchun
/// autentifikatsiya token'idagi foydalanuvchi ishlatiladi (xavfsizlik).
/// </summary>
public sealed record RespondRequest(string Status);

public sealed record RecommendationRow(
    long RecId,
    DateTime GeneratedAt,
    string ActionType,
    JsonElement ActionPayload,
    string Reason,
    JsonElement ExpectedBenefit,
    string Status,
    DateTime? RespondedAt);

public sealed record RespondResult(long RecId, string Status);

/// <summary>
/// SignalR `recommendationCreated` payload'i (camelCase) — FAZA1_UMUMIY §7.2.
/// ML passthrough javobidan (snake_case) moslashtiriladi.
/// </summary>
public sealed record RecommendationDto(
    long RecId,
    string ActionType,          // open_counter | close_counter | route_queue | reassign_operator
    string Action,
    string Reason,
    JsonElement Benefit,
    string Status,
    string GeneratedAt);
