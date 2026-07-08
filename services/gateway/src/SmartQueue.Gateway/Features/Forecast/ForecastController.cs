using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Forecast;

/// <summary>Bashorat: ML servisiga proxy — /api/forecast.</summary>
[ApiController]
[Route("api")]
[Authorize]
public sealed class ForecastController(MlClient ml) : ControllerBase
{
    [HttpGet("forecast")]
    public async Task<IActionResult> Get(
        int branchId, int? hours, int? serviceTypeId, CancellationToken ct)
    {
        var result = await ml.ForecastAsync(branchId, hours ?? 24, serviceTypeId, ct);
        return new ContentResult
        {
            Content = result.Body,
            ContentType = "application/json",
            StatusCode = result.StatusCode,
        };
    }
}
