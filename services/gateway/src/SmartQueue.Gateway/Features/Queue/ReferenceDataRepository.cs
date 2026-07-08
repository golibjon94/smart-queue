using Npgsql;

namespace SmartQueue.Gateway.Features.Queue;

/// <summary>Filial / kassa / xizmat turi referens ma'lumotini o'qiydi.</summary>
public sealed class ReferenceDataRepository(NpgsqlDataSource db)
{
    public async Task<string?> GetBranchNameAsync(int branchId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT name FROM branches WHERE branch_id = $1", conn)
        {
            Parameters = { new() { Value = branchId } },
        };
        return (string?)await cmd.ExecuteScalarAsync(ct);
    }

    public async Task<IReadOnlyList<CounterRow>> GetCountersAsync(
        int branchId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT counter_id, number, name, is_active, supported_service_types
            FROM counters
            WHERE branch_id = $1
            ORDER BY number
            """, conn)
        {
            Parameters = { new() { Value = branchId } },
        };

        var counters = new List<CounterRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
        {
            counters.Add(new CounterRow(
                rd.GetInt32(0),
                rd.GetInt32(1),
                rd.IsDBNull(2) ? null : rd.GetString(2),
                rd.GetBoolean(3),
                rd.IsDBNull(4) ? [] : rd.GetFieldValue<int[]>(4)));
        }
        return counters;
    }

    public async Task<IReadOnlyList<ServiceTypeRow>> GetServiceTypesAsync(
        CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT service_type_id, name, avg_service_time_sec
            FROM service_types
            ORDER BY service_type_id
            """, conn);

        var services = new List<ServiceTypeRow>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            services.Add(new ServiceTypeRow(rd.GetInt32(0), rd.GetString(1), rd.GetInt32(2)));
        return services;
    }
}
