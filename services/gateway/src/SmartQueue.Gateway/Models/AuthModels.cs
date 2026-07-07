namespace SmartQueue.Gateway.Models;

public record LoginRequest(string Username, string Password);

public record UserInfo(long UserId, string Username, string? FullName, string Role);

public record LoginResponse(string Token, DateTimeOffset ExpiresAt, UserInfo User);
