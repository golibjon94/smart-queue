using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartQueue.Gateway.Features.Realtime;

namespace SmartQueue.Gateway.Features.Queue;

/// <summary>Navbat holati va demo ssenariylari: /api/queue-state, /api/demo/scenario.</summary>
[ApiController]
[Route("api")]
[Authorize]
public sealed class QueueController(DemoStateService demo, IRealtimeNotifier notifier) : ControllerBase
{
    [HttpGet("queue-state")]
    public async Task<IActionResult> GetState(int branchId, CancellationToken ct) =>
        Ok(await demo.GetStateAsync(branchId, ct));

    [HttpPost("demo/scenario")]
    public async Task<IActionResult> SetScenario(ScenarioRequest req, CancellationToken ct)
    {
        var state = await demo.SetScenarioAsync(req.BranchId, req.Scenario, ct);
        // Ssenariy o'zgarishini darhol jonli push qil (FAZA1_UMUMIY §4).
        await notifier.QueueStateUpdatedAsync(req.BranchId, state, ct);
        return Ok(state);
    }
}
