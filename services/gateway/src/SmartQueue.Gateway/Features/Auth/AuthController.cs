using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Common;

namespace SmartQueue.Gateway.Features.Auth;

/// <summary>Autentifikatsiya: /api/auth/*.</summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new ErrorResponse("Login va parol majburiy"));

        var result = await auth.LoginAsync(req.Username.Trim(), req.Password, ct);
        return result is null
            ? Unauthorized(new ErrorResponse("Login yoki parol noto'g'ri"))
            : Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() =>
        Ok(new CurrentUserResponse(
            UserId: User.FindFirstValue(ClaimTypes.NameIdentifier),
            Username: User.Identity?.Name,
            FullName: User.FindFirstValue("full_name"),
            Role: User.FindFirstValue(ClaimTypes.Role)));
}
