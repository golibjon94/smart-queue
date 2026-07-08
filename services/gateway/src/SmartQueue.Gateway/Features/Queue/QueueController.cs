using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmartQueue.Gateway.Features.Queue;

/// <summary>Navbat holati va demo ssenariylari: /api/queue-state, /api/demo/scenario.</summary>
[ApiController]
[Route("api")]
[Authorize]
public sealed class QueueController(DemoStateService demo) : ControllerBase
{
    [HttpGet("queue-state")]
    public async Task<IActionResult> GetState(int branchId, CancellationToken ct) =>
        Ok(await demo.GetStateAsync(branchId, ct));

    [HttpPost("demo/scenario")]
    public async Task<IActionResult> SetScenario(ScenarioRequest req, CancellationToken ct) =>
        Ok(await demo.SetScenarioAsync(req.BranchId, req.Scenario, ct));
}
