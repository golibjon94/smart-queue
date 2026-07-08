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
