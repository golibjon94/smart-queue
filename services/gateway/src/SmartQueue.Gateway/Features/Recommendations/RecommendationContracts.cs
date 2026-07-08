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
