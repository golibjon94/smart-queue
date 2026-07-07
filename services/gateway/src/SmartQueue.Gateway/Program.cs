using Npgsql;
using SmartQueue.Gateway.Models;
using SmartQueue.Gateway.Services;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

var mlUrl = cfg["ML_SERVICE_URL"] ?? "http://localhost:8000";
var apiKey = cfg["GATEWAY_API_KEY"] ?? "dev_api_key_change_me";
var dashboardOrigin = cfg["DASHBOARD_ORIGIN"] ?? "http://localhost:4200";

var connString = new NpgsqlConnectionStringBuilder
{
    Host = cfg["POSTGRES_HOST"] ?? "localhost",
    Port = int.Parse(cfg["POSTGRES_PORT"] ?? "5433"),
    Username = cfg["POSTGRES_USER"] ?? "smartqueue",
    Password = cfg["POSTGRES_PASSWORD"] ?? "change_me_dev_only",
    Database = cfg["POSTGRES_DB"] ?? "smartqueue",
}.ConnectionString;

builder.Services.AddSingleton(NpgsqlDataSource.Create(connString));
builder.Services.AddSingleton<DemoStateService>();
builder.Services.AddHttpClient<MlClient>(c =>
{
    c.BaseAddress = new Uri(mlUrl);
    c.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(dashboardOrigin).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// Oddiy API-key himoyasi (Faza 0; to'liq JWT — Faza 1)
app.Use(async (ctx, next) =>
{
    var path = ctx.Request.Path;
    if (path != "/health" && HttpMethods.IsOptions(ctx.Request.Method) == false
        && ctx.Request.Headers["X-Api-Key"] != apiKey)
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await ctx.Response.WriteAsJsonAsync(new { error = "X-Api-Key noto'g'ri yoki yo'q" });
        return;
    }
    await next();
});

// --- Health ---
app.MapGet("/health", async (NpgsqlDataSource db, MlClient ml) =>
{
    var dbOk = false;
    try
    {
        await using var conn = await db.OpenConnectionAsync();
        dbOk = true;
    }
    catch { /* dbOk = false */ }

    var mlHealth = await ml.HealthAsync();
    return Results.Ok(new
    {
        status = dbOk ? "ok" : "degraded",
        db = dbOk ? "ok" : "down",
        ml = mlHealth is null ? "down" : "ok",
    });
});

// --- Joriy navbat holati ---
app.MapGet("/api/queue-state", async (int branchId, DemoStateService demo) =>
    Results.Ok(await demo.GetStateAsync(branchId)));

// --- Demo ssenariy almashtirish (normal | lunch_peak) ---
app.MapPost("/api/demo/scenario", async (ScenarioRequest req, DemoStateService demo) =>
    Results.Ok(await demo.SetScenarioAsync(req.BranchId, req.Scenario)));

// --- Bashorat (ML proxy) ---
app.MapGet("/api/forecast", async (int branchId, int? hours, int? serviceTypeId, MlClient ml) =>
{
    var (code, body) = await ml.ForecastAsync(branchId, hours ?? 24, serviceTypeId);
    return Results.Content(body, "application/json", statusCode: code);
});

// --- Tavsiyalarni yangilash: joriy holat -> ML -> DB + javob ---
app.MapPost("/api/recommendations/refresh", async (int branchId,
    DemoStateService demo, MlClient ml) =>
{
    var state = await demo.GetStateAsync(branchId);
    var req = new MlRecommendationRequest(branchId,
        state.Queues.Select(q => new MlServiceState(
            q.ServiceTypeId, q.Waiting, q.OpenCounters, q.ArrivalsPerHour)).ToList());
    var (code, body) = await ml.RecommendationsAsync(req);
    return Results.Content(body, "application/json", statusCode: code);
});

// --- Tavsiyalar ro'yxati (DB'dan) ---
app.MapGet("/api/recommendations", async (int branchId, string? status, NpgsqlDataSource db) =>
{
    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = new NpgsqlCommand(
        """
        SELECT rec_id, generated_at, action_type, action_payload::text,
               reason, expected_benefit::text, status, responded_at
        FROM recommendations
        WHERE branch_id = $1 AND ($2::text IS NULL OR status = $2)
        ORDER BY generated_at DESC LIMIT 50
        """, conn)
    {
        Parameters = { new() { Value = branchId }, new() { Value = (object?)status ?? DBNull.Value } },
    };
    var result = new List<object>();
    await using var rd = await cmd.ExecuteReaderAsync();
    while (await rd.ReadAsync())
    {
        result.Add(new
        {
            recId = rd.GetInt64(0),
            generatedAt = rd.GetDateTime(1),
            actionType = rd.GetString(2),
            actionPayload = System.Text.Json.JsonDocument.Parse(rd.GetString(3)),
            reason = rd.GetString(4),
            expectedBenefit = System.Text.Json.JsonDocument.Parse(rd.GetString(5)),
            status = rd.GetString(6),
            respondedAt = rd.IsDBNull(7) ? (DateTime?)null : rd.GetDateTime(7),
        });
    }
    return Results.Ok(result);
});

// --- Menejer javobi: qabul / rad (audit izi) ---
app.MapPost("/api/recommendations/{recId:long}/respond", async (long recId,
    RespondRequest req, NpgsqlDataSource db) =>
{
    if (req.Status is not ("accepted" or "rejected"))
        return Results.BadRequest(new { error = "status faqat 'accepted' yoki 'rejected'" });

    await using var conn = await db.OpenConnectionAsync();
    await using var cmd = new NpgsqlCommand(
        """
        UPDATE recommendations
        SET status = $2, responded_by = $3, responded_at = now()
        WHERE rec_id = $1 AND status = 'proposed'
        RETURNING rec_id
        """, conn)
    {
        Parameters =
        {
            new() { Value = recId },
            new() { Value = req.Status },
            new() { Value = (object?)req.RespondedBy ?? DBNull.Value },
        },
    };
    var updated = await cmd.ExecuteScalarAsync();
    return updated is null
        ? Results.NotFound(new { error = "Tavsiya topilmadi yoki allaqachon javob berilgan" })
        : Results.Ok(new { recId, status = req.Status });
});

app.Run();
