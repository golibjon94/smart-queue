using Microsoft.Extensions.Options;
using SmartQueue.Gateway.Configuration;

namespace SmartQueue.Gateway.Features.Auth;

/// <summary>Login validatsiyasi, JWT chiqarish va default admin seed'i.</summary>
public sealed class AuthService(
    UserRepository users,
    JwtTokenGenerator tokens,
    ILogger<AuthService> log)
{
    public async Task<LoginResponse?> LoginAsync(
        string username, string password, CancellationToken ct = default)
    {
        var record = await users.FindActiveByUsernameAsync(username, ct);
        if (record is null || !BCrypt.Net.BCrypt.Verify(password, record.PasswordHash))
            return null;

        await users.TouchLastLoginAsync(record.UserId, ct);

        var user = new UserInfo(record.UserId, username, record.FullName, record.Role);
        var (token, expires) = tokens.Generate(user);
        return new LoginResponse(token, expires, user);
    }

    /// <summary>Startup'da default admin foydalanuvchisini yaratadi (agar yo'q bo'lsa).</summary>
    public async Task EnsureDefaultAdminAsync(AdminOptions admin, CancellationToken ct = default)
    {
        if (await users.ExistsAsync(admin.Username, ct))
        {
            log.LogInformation("Default admin '{User}' allaqachon mavjud", admin.Username);
            return;
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(admin.Password);
        await users.CreateAsync(admin.Username, hash, "Administrator", "admin", ct);
        log.LogWarning("Default admin '{User}' yaratildi — parolni almashtiring!", admin.Username);
    }
}
