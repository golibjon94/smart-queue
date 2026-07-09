using System.Net.Http.Json;
using System.Text.Json;

namespace SmartQueue.Gateway.Infrastructure.Ml;

/// <summary>
/// Python ML servisiga typed HTTP klient. Forecast/recommendations javoblari
/// mijozga o'zgarishsiz uzatiladi (passthrough) — shakl ML tomonda belgilanadi.
/// </summary>
public sealed class MlClient(HttpClient http)
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    /// <summary>ML holati (health). Servis yetib bo'lmasa null qaytadi.</summary>
    public async Task<JsonElement?> HealthAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await http.GetAsync("/health", ct);
            resp.EnsureSuccessStatusCode();
            return await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts, ct);
        }
        catch
        {
            return null;
        }
    }

    public Task<MlProxyResult> ForecastAsync(
        int branchId, int hours, int? serviceTypeId, CancellationToken ct = default) =>
        PostPassthroughAsync("/forecast",
            new MlForecastRequest(branchId, hours, serviceTypeId), ct);

    public Task<MlProxyResult> RecommendationsAsync(
        MlRecommendationRequest req, CancellationToken ct = default) =>
        PostPassthroughAsync("/recommendations", req, ct);

    /// <summary>
    /// Anomaliyalar — passthrough emas, typed: Gateway snake_case → camelCase
    /// moslashtiradi (FAZA1_UMUMIY §7.3).
    /// </summary>
    public async Task<MlAnomalyResponse?> AnomaliesAsync(
        int branchId, int lookbackHours, CancellationToken ct = default)
    {
        using var resp = await http.PostAsJsonAsync(
            "/anomalies", new MlAnomalyRequest(branchId, lookbackHours), JsonOpts, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<MlAnomalyResponse>(JsonOpts, ct);
    }

    /// <summary>What-if simulyatsiya (§4). ML yetib bo'lmasa istisno tashlaydi.</summary>
    public async Task<MlSimulateResponse?> SimulateAsync(
        MlSimulateRequest req, CancellationToken ct = default)
    {
        using var resp = await http.PostAsJsonAsync("/simulate", req, JsonOpts, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<MlSimulateResponse>(JsonOpts, ct);
    }

    /// <summary>QR virtual navbat ETA (§5.5, forecast bilan tuzatilgan).</summary>
    public async Task<MlEtaResponse?> EtaAsync(MlEtaRequest req, CancellationToken ct = default)
    {
        using var resp = await http.PostAsJsonAsync("/eta", req, JsonOpts, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<MlEtaResponse>(JsonOpts, ct);
    }

    /// <summary>O'zbekcha izohlarni sentiment/mavzu bo'yicha tasniflaydi (§6.2).</summary>
    public async Task<MlClassifyResponse?> ClassifyFeedbackAsync(
        IReadOnlyList<string> comments, CancellationToken ct = default)
    {
        using var resp = await http.PostAsJsonAsync(
            "/classify-feedback", new MlClassifyRequest(comments), JsonOpts, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<MlClassifyResponse>(JsonOpts, ct);
    }

    private async Task<MlProxyResult> PostPassthroughAsync<TRequest>(
        string path, TRequest body, CancellationToken ct)
    {
        using var resp = await http.PostAsJsonAsync(path, body, JsonOpts, ct);
        var payload = await resp.Content.ReadAsStringAsync(ct);
        return new MlProxyResult((int)resp.StatusCode, payload);
    }
}

/// <summary>ML javobini mijozga o'zgarishsiz uzatish uchun (status + JSON body).</summary>
public readonly record struct MlProxyResult(int StatusCode, string Body);
