using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Common;

namespace SmartQueue.Gateway.Features.Recommendations;

/// <summary>Tavsiyalar: /api/recommendations/*.</summary>
[ApiController]
[Route("api/recommendations")]
[Authorize]
public sealed class RecommendationsController(RecommendationService service) : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["accepted", "rejected"];

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(int branchId, CancellationToken ct)
    {
        var result = await service.RefreshAsync(branchId, ct);
        return new ContentResult
        {
            Content = result.Body,
            ContentType = "application/json",
            StatusCode = result.StatusCode,
        };
    }

    [HttpGet]
    public async Task<IActionResult> List(int branchId, string? status, CancellationToken ct) =>
        Ok(await service.ListAsync(branchId, status, ct));

    [HttpPost("{recId:long}/respond")]
    public async Task<IActionResult> Respond(long recId, RespondRequest req, CancellationToken ct)
    {
        if (!AllowedStatuses.Contains(req.Status))
            return BadRequest(new ErrorResponse("status faqat 'accepted' yoki 'rejected'"));

        // Audit izi: kim javob berganini token'dan olamiz (body'dan emas).
        int? respondedBy =
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var updated = await service.RespondAsync(recId, req.Status, respondedBy, ct);
        return updated
            ? Ok(new RespondResult(recId, req.Status))
            : NotFound(new ErrorResponse("Tavsiya topilmadi yoki allaqachon javob berilgan"));
    }
}
