using Npgsql;

namespace SmartQueue.Gateway.Features.Auth;

/// <summary>users jadvaliga barcha ma'lumot kirishini kapsulalaydi.</summary>
public sealed class UserRepository(NpgsqlDataSource db)
{
    public async Task<UserRecord?> FindActiveByUsernameAsync(
        string username, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT user_id, password_hash, full_name, role
            FROM users
            WHERE username = $1 AND is_active
            """, conn)
        {
            Parameters = { new() { Value = username } },
        };

        await using var rd = await cmd.ExecuteReaderAsync(ct);
        if (!await rd.ReadAsync(ct))
            return null;

        return new UserRecord(
            rd.GetInt64(0),
            rd.GetString(1),
            rd.IsDBNull(2) ? null : rd.GetString(2),
            rd.GetString(3));
    }

    public async Task TouchLastLoginAsync(long userId, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "UPDATE users SET last_login_at = now() WHERE user_id = $1", conn)
        {
            Parameters = { new() { Value = userId } },
        };
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<bool> ExistsAsync(string username, CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT 1 FROM users WHERE username = $1", conn)
        {
            Parameters = { new() { Value = username } },
        };
        return await cmd.ExecuteScalarAsync(ct) is not null;
    }

    public async Task CreateAsync(
        string username, string passwordHash, string fullName, string role,
        CancellationToken ct = default)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO users (username, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4)
            """, conn)
        {
            Parameters =
            {
                new() { Value = username },
                new() { Value = passwordHash },
                new() { Value = fullName },
                new() { Value = role },
            },
        };
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
