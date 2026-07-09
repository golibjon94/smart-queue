using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Common;

namespace SmartQueue.Gateway.Features.VirtualQueue;

/// <summary>
/// QR virtual navbat: /api/vq/* (FAZA2_UMUMIY §5.2).
/// join/status/leave — public (login yo'q, token bilan), boshqa origin'dan ham
/// ishlashi uchun "public" CORS siyosati. tickets — menejer uchun (JWT).
/// </summary>
[ApiController]
[Route("api/vq")]
public sealed class VqController(VqService service, VqRateLimiter rateLimiter) : ControllerBase
{
    [HttpPost("join")]
    [AllowAnonymous]
    [EnableCors("public")]
    public async Task<IActionResult> Join(VqJoinRequest req, CancellationToken ct)
    {
        // Abuse himoyasi: IP + filial bo'yicha soniyada bitta join.
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!rateLimiter.TryAcquire($"{ip}:{req.BranchId}"))
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new ErrorResponse("Juda tez-tez urinish — bir lahza kuting"));

        var result = await service.JoinAsync(req.BranchId, req.ServiceTypeId, ct);
        return Ok(result);
    }

    [HttpGet("status/{token}")]
    [AllowAnonymous]
    [EnableCors("public")]
    public async Task<IActionResult> Status(string token, CancellationToken ct)
    {
        var status = await service.GetStatusAsync(token, ct);
        return status is null
            ? NotFound(new ErrorResponse("Talon topilmadi"))
            : Ok(status);
    }

    [HttpPost("leave/{token}")]
    [AllowAnonymous]
    [EnableCors("public")]
    public async Task<IActionResult> Leave(string token, CancellationToken ct)
    {
        var status = await service.LeaveAsync(token, ct);
        return status is null
            ? NotFound(new ErrorResponse("Talon topilmadi"))
            : Ok(status);
    }

    /// <summary>Menejer dashboardi: filialning faol virtual talonlari (fizik bilan birga ko'rsatish uchun).</summary>
    [HttpGet("tickets")]
    [Authorize]
    public async Task<IActionResult> Tickets(int branchId, CancellationToken ct) =>
        Ok(await service.ListWaitingAsync(branchId, ct));
}
