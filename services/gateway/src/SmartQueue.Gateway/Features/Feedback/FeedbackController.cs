using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Common;

namespace SmartQueue.Gateway.Features.Feedback;

/// <summary>
/// Sentiment-feedback: /api/feedback (FAZA2_UMUMIY §6.1).
/// POST — mijoz qoldiradi (public/token, boshqa origin uchun "public" CORS).
/// GET summary — menejer (JWT).
/// </summary>
[ApiController]
[Route("api/feedback")]
public sealed class FeedbackController(FeedbackService service) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableCors("public")]
    public async Task<IActionResult> Submit(FeedbackRequest req, CancellationToken ct)
    {
        if (req.Rating is < 1 or > 5)
            return BadRequest(new ErrorResponse("rating 1..5 oralig'ida bo'lishi kerak"));

        var result = await service.SubmitAsync(req, ct);
        return Ok(result);
    }

    [HttpGet("summary")]
    [Authorize]
    public async Task<IActionResult> Summary(
        int branchId, DateTimeOffset? from, DateTimeOffset? to, CancellationToken ct) =>
        Ok(await service.SummaryAsync(branchId, from, to, ct));
}
