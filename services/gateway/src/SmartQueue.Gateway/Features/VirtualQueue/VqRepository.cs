using Npgsql;

namespace SmartQueue.Gateway.Features.VirtualQueue;

/// <summary>virtual_tickets jadvaliga ma'lumot kirishi (raw ADO.NET, holatsiz).</summary>
public sealed class VqRepository(NpgsqlDataSource db)
{
    private const string SelectColumns =
        "token, ticket_number, branch_id, service_type_id, status, joined_at";

    /// <summary>Yangi 'waiting' talon qo'shadi.</summary>
    public async Task InsertAsync(
        string token, string ticketNumber, int branchId, int serviceTypeId,
        CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO virtual_tickets (token, ticket_number, branch_id, service_type_id, status)
            VALUES ($1, $2, $3, $4, 'waiting')
            """, conn)
        {
            Parameters =
            {
                new() { Value = token },
                new() { Value = ticketNumber },
                new() { Value = branchId },
                new() { Value = serviceTypeId },
            },
        };
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<VqTicketRow?> GetByTokenAsync(string token, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            $"SELECT {SelectColumns} FROM virtual_tickets WHERE token = $1", conn)
        {
            Parameters = { new() { Value = token } },
        };
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        return await rd.ReadAsync(ct) ? Read(rd) : null;
    }

    /// <summary>Shu filial+xizmatda mendan oldin qo'shilgan 'waiting' virtual talonlar soni.</summary>
    public async Task<int> CountWaitingBeforeAsync(
        int branchId, int serviceTypeId, DateTimeOffset joinedAt, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT count(*) FROM virtual_tickets
            WHERE branch_id = $1 AND service_type_id = $2
              AND status = 'waiting' AND joined_at < $3
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = serviceTypeId },
                new() { Value = joinedAt },
            },
        };
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
    }

    /// <summary>Shu filial+xizmatda kutayotgan virtual talonlar soni (join'dan oldingi holat).</summary>
    public async Task<int> CountWaitingAsync(
        int branchId, int serviceTypeId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT count(*) FROM virtual_tickets
            WHERE branch_id = $1 AND service_type_id = $2 AND status = 'waiting'
            """, conn)
        {
            Parameters =
            {
                new() { Value = branchId },
                new() { Value = serviceTypeId },
            },
        };
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
    }

    /// <summary>Filial bo'yicha jami virtual talonlar (ketma-ket talon raqami uchun).</summary>
    public async Task<int> CountForBranchAsync(int branchId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT count(*) FROM virtual_tickets WHERE branch_id = $1", conn)
        {
            Parameters = { new() { Value = branchId } },
        };
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
    }

    /// <summary>Statusni yangilaydi. Yangilangan bo'lsa true (masalan leave: waiting -> abandoned).</summary>
    public async Task<bool> SetStatusAsync(
        string token, string status, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE virtual_tickets
            SET status = $2, updated_at = now()
            WHERE token = $1
            RETURNING token
            """, conn)
        {
            Parameters =
            {
                new() { Value = token },
                new() { Value = status },
            },
        };
        return await cmd.ExecuteScalarAsync(ct) is not null;
    }

    /// <summary>Barcha kutayotgan virtual talonlar (background pusher uchun), tartiblangan.</summary>
    public async Task<IReadOnlyList<VqTicketRow>> ListWaitingAsync(CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            $"""
            SELECT {SelectColumns} FROM virtual_tickets
            WHERE status = 'waiting'
            ORDER BY branch_id, service_type_id, joined_at
            """, conn);

        var rows = new List<VqTicketRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            rows.Add(Read(rd));
        return rows;
    }

    /// <summary>Filial bo'yicha faol (waiting) virtual talonlar — menejer dashboardi uchun.</summary>
    public async Task<IReadOnlyList<VqTicketRow>> ListWaitingByBranchAsync(
        int branchId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            $"""
            SELECT {SelectColumns} FROM virtual_tickets
            WHERE branch_id = $1 AND status = 'waiting'
            ORDER BY service_type_id, joined_at
            """, conn)
        {
            Parameters = { new() { Value = branchId } },
        };

        var rows = new List<VqTicketRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            rows.Add(Read(rd));
        return rows;
    }

    private static VqTicketRow Read(NpgsqlDataReader rd) => new(
        Token: rd.GetString(0),
        TicketNumber: rd.GetString(1),
        BranchId: rd.GetInt32(2),
        ServiceTypeId: rd.GetInt32(3),
        Status: rd.GetString(4),
        JoinedAt: rd.GetFieldValue<DateTimeOffset>(5));
}
