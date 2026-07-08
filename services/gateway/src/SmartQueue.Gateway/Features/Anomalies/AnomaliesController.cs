using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmartQueue.Gateway.Features.Anomalies;

/// <summary>Anomaliya: ML servisiga proxy + SignalR push — /api/anomalies.</summary>
[ApiController]
[Route("api")]
[Authorize]
public sealed class AnomaliesController(AnomalyService service) : ControllerBase
{
    [HttpGet("anomalies")]
    public async Task<IActionResult> Get(int branchId, int? lookbackHours, CancellationToken ct) =>
        Ok(await service.GetAndPushAsync(
            branchId, lookbackHours ?? AnomalyService.DefaultLookbackHours, ct));
}
