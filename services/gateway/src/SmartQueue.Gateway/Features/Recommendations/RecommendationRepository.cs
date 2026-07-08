using System.Text.Json;
using Npgsql;

namespace SmartQueue.Gateway.Features.Recommendations;

/// <summary>recommendations jadvaliga ma'lumot kirishi (o'qish + audit yozuvi).</summary>
public sealed class RecommendationRepository(NpgsqlDataSource db)
{
    public async Task<IReadOnlyList<RecommendationRow>> ListAsync(
        int branchId, string? status, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT rec_id, generated_at, action_type, action_payload::text,
                   reason, expected_benefit::text, status, responded_at
            FROM recommendations
            WHERE branch_id = $1 AND ($2::text IS NULL OR status = $2)
            ORDER BY generated_at DESC
            LIMIT 50
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = (object?)status ?? DBNull.Value },
            },
        };

        var rows = new List<RecommendationRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
        {
            rows.Add(new RecommendationRow(
                RecId: rd.GetInt64(0),
                GeneratedAt: rd.GetDateTime(1),
                ActionType: rd.GetString(2),
                ActionPayload: ParseJson(rd.GetString(3)),
                Reason: rd.GetString(4),
                ExpectedBenefit: ParseJson(rd.GetString(5)),
                Status: rd.GetString(6),
                RespondedAt: rd.IsDBNull(7) ? null : rd.GetDateTime(7)));
        }
        return rows;
    }

    /// <summary>'proposed' tavsiyaga javob yozadi. Yangilangan bo'lsa true.</summary>
    public async Task<bool> RespondAsync(
        long recId, string status, int? respondedBy, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE recommendations
            SET status = $2, responded_by = $3, responded_at = now()
            WHERE rec_id = $1 AND status = 'proposed'
            RETURNING rec_id
            """, conn)
        {
            Parameters =
            {
                new() { Value = recId },
                new() { Value = status },
                new() { Value = (object?)respondedBy ?? DBNull.Value },
            },
        };
        return await cmd.ExecuteScalarAsync(ct) is not null;
    }

    // JSONB matnini o'zini-o'zi saqlaydigan JsonElement'ga aylantiradi
    // (JsonDocument disposal leak'idan xoli).
    private static JsonElement ParseJson(string json) =>
        JsonSerializer.Deserialize<JsonElement>(json);
}
