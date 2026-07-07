using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SmartQueue.Gateway.Models;

namespace SmartQueue.Gateway.Services;

public class JwtOptions
{
    public required string Key { get; init; }
    public string Issuer { get; init; } = "smart-queue";
    public string Audience { get; init; } = "smart-queue-dashboard";
    public int ExpiryHours { get; init; } = 8;
}

/// <summary>Login validatsiyasi, JWT chiqarish va default admin seed'i.</summary>
public class AuthService(NpgsqlDataSource db, JwtOptions jwt, ILogger<AuthService> log)
{
    /// <summary>Startup'da default admin foydalanuvchisini yaratadi (agar yo'q bo'lsa).</summary>
    public async Task EnsureDefaultAdminAsync(string username, string password)
    {
        await using var conn = await db.OpenConnectionAsync();
        await using (var check = new NpgsqlCommand(
            "SELECT 1 FROM users WHERE username = $1", conn) { Parameters = { new() { Value = username } } })
        {
            if (await check.ExecuteScalarAsync() is not null)
            {
                log.LogInformation("Default admin '{User}' allaqachon mavjud", username);
                return;
            }
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        await using var insert = new NpgsqlCommand(
            """
            INSERT INTO users (username, password_hash, full_name, role)
            VALUES ($1, $2, $3, 'admin')
            """, conn)
        {
            Parameters =
            {
                new() { Value = username },
                new() { Value = hash },
                new() { Value = "Administrator" },
            },
        };
        await insert.ExecuteNonQueryAsync();
        log.LogWarning("Default admin '{User}' yaratildi — parolni almashtiring!", username);
    }

    public async Task<LoginResponse?> LoginAsync(string username, string password)
    {
        await using var conn = await db.OpenConnectionAsync();
        long userId;
        string hash, role;
        string? fullName;

        await using (var cmd = new NpgsqlCommand(
            """
            SELECT user_id, password_hash, full_name, role
            FROM users WHERE username = $1 AND is_active
            """, conn) { Parameters = { new() { Value = username } } })
        await using (var rd = await cmd.ExecuteReaderAsync())
        {
            if (!await rd.ReadAsync())
                return null;
            userId = rd.GetInt64(0);
            hash = rd.GetString(1);
            fullName = rd.IsDBNull(2) ? null : rd.GetString(2);
            role = rd.GetString(3);
        }

        if (!BCrypt.Net.BCrypt.Verify(password, hash))
            return null;

        await using (var upd = new NpgsqlCommand(
            "UPDATE users SET last_login_at = now() WHERE user_id = $1", conn)
            { Parameters = { new() { Value = userId } } })
        {
            await upd.ExecuteNonQueryAsync();
        }

        var user = new UserInfo(userId, username, fullName, role);
        var (token, expires) = GenerateToken(user);
        return new LoginResponse(token, expires, user);
    }

    private (string Token, DateTimeOffset ExpiresAt) GenerateToken(UserInfo user)
    {
        var expires = DateTimeOffset.UtcNow.AddHours(jwt.ExpiryHours);
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("full_name", user.FullName ?? user.Username),
        };

        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: expires.UtcDateTime,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
