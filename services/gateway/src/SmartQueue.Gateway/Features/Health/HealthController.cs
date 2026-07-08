using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.Health;

public sealed record HealthResponse(string Status, string Db, string Ml);

/// <summary>Ochiq holat endpoint'i: DB va ML mavjudligini tekshiradi.</summary>
[ApiController]
[Route("health")]
[AllowAnonymous]
public sealed class HealthController(NpgsqlDataSource db, MlClient ml) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dbOk = await CanConnectAsync(db, ct);
        var mlOk = await ml.HealthAsync(ct) is not null;

        return Ok(new HealthResponse(
            Status: dbOk ? "ok" : "degraded",
            Db: dbOk ? "ok" : "down",
            Ml: mlOk ? "ok" : "down"));
    }

    private static async Task<bool> CanConnectAsync(NpgsqlDataSource db, CancellationToken ct)
    {
        try
        {
            await using var conn = await db.OpenConnectionAsync(ct);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
