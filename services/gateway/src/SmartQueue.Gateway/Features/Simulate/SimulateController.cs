using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Common;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Simulate;

/// <summary>
/// What-if simulyatsiya: ML `/simulate`'ga proxy — /api/simulate (§4).
/// Side-effektsiz, DB yozuvsiz — faqat hisob. Angular camelCase yuboradi,
/// Gateway ML snake_case'ga o'giradi va javobni yana camelCase qilib qaytaradi.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public sealed class SimulateController(MlClient ml) : ControllerBase
{
    [HttpPost("simulate")]
    public async Task<IActionResult> Simulate(SimulateRequest req, CancellationToken ct)
    {
        var mlReq = new MlSimulateRequest(
            req.BranchId,
            req.ServiceTypeId,
            new MlSimulateScenarioIn(
                req.Scenario.OpenCounters,
                req.Scenario.ArrivalsPerHour,
                req.Scenario.AvgServiceSec));

        MlSimulateResponse? result;
        try
        {
            result = await ml.SimulateAsync(mlReq, ct);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new ErrorResponse($"ML servisi javob bermadi: {ex.Message}"));
        }

        if (result is null)
            return StatusCode(StatusCodes.Status502BadGateway,
                new ErrorResponse("ML servisidan bo'sh javob"));

        return Ok(new SimulateResult(
            result.BranchId,
            result.ServiceTypeId,
            Map(result.Baseline),
            Map(result.Scenario),
            new SimulateDelta(result.Delta.WaitReductionSec, result.Delta.WaitReductionPct)));
    }

    private static SimulateSnapshot Map(MlSimulateSnapshot s) =>
        new(s.OpenCounters, s.AvgWaitSec, s.Utilization, s.ProbWait);
}
