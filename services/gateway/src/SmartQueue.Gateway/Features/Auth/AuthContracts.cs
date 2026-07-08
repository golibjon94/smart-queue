namespace SmartQueue.Gateway.Features.Auth;

// --- So'rov / javob DTO'lari ---

public sealed record LoginRequest(string Username, string Password);

public sealed record UserInfo(long UserId, string Username, string? FullName, string Role);

public sealed record LoginResponse(string Token, DateTimeOffset ExpiresAt, UserInfo User);

public sealed record CurrentUserResponse(
    string? UserId, string? Username, string? FullName, string? Role);

// --- Domen / persistence yozuvi (parol hash'i bilan) ---

public sealed record UserRecord(long UserId, string PasswordHash, string? FullName, string Role);
