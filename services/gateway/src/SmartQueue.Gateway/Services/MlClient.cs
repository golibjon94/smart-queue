using System.Text;
using System.Text.Json;
using SmartQueue.Gateway.Models;

namespace SmartQueue.Gateway.Services;

/// <summary>Python ML servisiga typed HTTP klient.</summary>
public class MlClient(HttpClient http)
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public async Task<JsonDocument?> HealthAsync(CancellationToken ct = default)
    {
        try
        {
            var resp = await http.GetAsync("/health", ct);
            return JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        }
        catch
        {
            return null;
        }
    }

    public async Task<(int StatusCode, string Body)> ForecastAsync(
        int branchId, int hours, int? serviceTypeId, CancellationToken ct = default)
    {
        var payload = JsonSerializer.Serialize(
            new { branch_id = branchId, hours, service_type_id = serviceTypeId }, JsonOpts);
        var resp = await http.PostAsync("/forecast",
            new StringContent(payload, Encoding.UTF8, "application/json"), ct);
        return ((int)resp.StatusCode, await resp.Content.ReadAsStringAsync(ct));
    }

    public async Task<(int StatusCode, string Body)> RecommendationsAsync(
        MlRecommendationRequest req, CancellationToken ct = default)
    {
        var payload = JsonSerializer.Serialize(req, JsonOpts);
        var resp = await http.PostAsync("/recommendations",
            new StringContent(payload, Encoding.UTF8, "application/json"), ct);
        return ((int)resp.StatusCode, await resp.Content.ReadAsStringAsync(ct));
    }
}
