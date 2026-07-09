using Npgsql;

namespace SmartQueue.Gateway.Features.Feedback;

/// <summary>feedback_csi jadvaliga yozish + summary jamlash (raw ADO.NET).</summary>
public sealed class FeedbackRepository(NpgsqlDataSource db)
{
    /// <summary>Feedback yozadi (izoh bo'lsa tasnif bilan). feedback_id qaytaradi.</summary>
    public async Task<long> InsertAsync(
        int branchId, long? ticketId, int rating, string? comment,
        FeedbackClassification? classification, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO feedback_csi
                (branch_id, ticket_id, rating, comment, sentiment, sentiment_score, topics)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING feedback_id
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = (object?)ticketId ?? DBNull.Value },
                new() { Value = rating },
                new() { Value = (object?)comment ?? DBNull.Value },
                new() { Value = (object?)classification?.Sentiment ?? DBNull.Value },
                new() { Value = (object?)classification?.Score ?? DBNull.Value },
                new() { Value = (object?)classification?.Topics ?? DBNull.Value },
            },
        };
        return (long)(await cmd.ExecuteScalarAsync(ct))!;
    }

    /// <summary>Sentiment bo'yicha son taqsimoti (null sentiment ham hisobga olinadi).</summary>
    public async Task<IReadOnlyList<SentimentCountRow>> GetSentimentCountsAsync(
        int branchId, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT sentiment, count(*)
            FROM feedback_csi
            WHERE branch_id = $1
              AND ($2::timestamptz IS NULL OR created_at >= $2)
              AND ($3::timestamptz IS NULL OR created_at < $3)
            GROUP BY sentiment
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = (object?)from ?? DBNull.Value },
                new() { Value = (object?)to ?? DBNull.Value },
            },
        };

        var rows = new List<SentimentCountRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            rows.Add(new SentimentCountRow(
                rd.IsDBNull(0) ? null : rd.GetString(0),
                Convert.ToInt32(rd.GetInt64(1))));
        return rows;
    }

    /// <summary>O'rtacha baho (feedback bo'lmasa 0).</summary>
    public async Task<double> GetAvgRatingAsync(
        int branchId, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT coalesce(avg(rating), 0)
            FROM feedback_csi
            WHERE branch_id = $1
              AND ($2::timestamptz IS NULL OR created_at >= $2)
              AND ($3::timestamptz IS NULL OR created_at < $3)
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = (object?)from ?? DBNull.Value },
                new() { Value = (object?)to ?? DBNull.Value },
            },
        };
        return Convert.ToDouble(await cmd.ExecuteScalarAsync(ct));
    }

    /// <summary>Top mavzular (topics massivini yoyib, son bo'yicha tartiblab).</summary>
    public async Task<IReadOnlyList<TopicCount>> GetTopTopicsAsync(
        int branchId, DateTimeOffset? from, DateTimeOffset? to, int limit,
        CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT topic, count(*) AS cnt
            FROM feedback_csi, unnest(topics) AS topic
            WHERE branch_id = $1
              AND topics IS NOT NULL
              AND ($2::timestamptz IS NULL OR created_at >= $2)
              AND ($3::timestamptz IS NULL OR created_at < $3)
            GROUP BY topic
            ORDER BY cnt DESC, topic
            LIMIT $4
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = (object?)from ?? DBNull.Value },
                new() { Value = (object?)to ?? DBNull.Value },
                new() { Value = limit },
            },
        };

        var rows = new List<TopicCount>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            rows.Add(new TopicCount(rd.GetString(0), Convert.ToInt32(rd.GetInt64(1))));
        return rows;
    }
}
