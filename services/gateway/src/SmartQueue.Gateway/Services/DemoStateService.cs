using System.Collections.Concurrent;
using Npgsql;
using SmartQueue.Gateway.Models;

namespace SmartQueue.Gateway.Services;

/// <summary>
/// Faza 0 demo holati: filial navbatlarining joriy "jonli" holatini xotirada
/// saqlaydi. Ssenariylar: normal | lunch_peak. Har o'qishda kichik jitter
/// qo'shiladi — dashboard jonli ko'rinadi.
/// (Faza 2 da bu servis o'rnini real iQueue ma'lumoti egallaydi.)
/// </summary>
public class DemoStateService(NpgsqlDataSource db)
{
    private readonly ConcurrentDictionary<int, BranchDemo> _branches = new();
    private readonly Random _rng = new(42);

    private sealed class BranchDemo
    {
        public required string BranchName { get; init; }
        public required string Scenario { get; set; }
        public required List<CounterRow> Counters { get; init; }
        public required List<ServiceRow> Services { get; init; }
        public required Dictionary<int, int> Waiting { get; set; }
        public required Dictionary<int, int> OpenPerService { get; set; }
    }

    private sealed record CounterRow(int CounterId, int Number, string? Name,
                                     bool IsActive, int[] Supported);

    private sealed record ServiceRow(int ServiceTypeId, string Name, double AvgSec,
                                     double Share);

    // seed_reference.sql / simulation config.py dagi ulushlarga mos
    private static readonly Dictionary<int, double> Shares = new()
    {
        [1] = 0.40, [2] = 0.15, [3] = 0.15, [4] = 0.10, [5] = 0.20,
    };

    private async Task<BranchDemo> LoadAsync(int branchId)
    {
        await using var conn = await db.OpenConnectionAsync();

        string branchName;
        await using (var cmd = new NpgsqlCommand(
            "SELECT name FROM branches WHERE branch_id = $1", conn) { Parameters = { new() { Value = branchId } } })
        {
            branchName = (string?)await cmd.ExecuteScalarAsync()
                ?? throw new InvalidOperationException($"Filial {branchId} topilmadi");
        }

        var counters = new List<CounterRow>();
        await using (var cmd = new NpgsqlCommand(
            """
            SELECT counter_id, number, name, is_active, supported_service_types
            FROM counters WHERE branch_id = $1 ORDER BY number
            """, conn) { Parameters = { new() { Value = branchId } } })
        await using (var rd = await cmd.ExecuteReaderAsync())
        {
            while (await rd.ReadAsync())
                counters.Add(new CounterRow(rd.GetInt32(0), rd.GetInt32(1),
                    rd.IsDBNull(2) ? null : rd.GetString(2), rd.GetBoolean(3),
                    rd.IsDBNull(4) ? [] : rd.GetFieldValue<int[]>(4)));
        }

        var services = new List<ServiceRow>();
        await using (var cmd = new NpgsqlCommand(
            "SELECT service_type_id, name, avg_service_time_sec FROM service_types ORDER BY service_type_id", conn))
        await using (var rd = await cmd.ExecuteReaderAsync())
        {
            while (await rd.ReadAsync())
            {
                var id = rd.GetInt32(0);
                services.Add(new ServiceRow(id, rd.GetString(1), rd.GetInt32(2),
                    Shares.GetValueOrDefault(id, 0.1)));
            }
        }

        var demo = new BranchDemo
        {
            BranchName = branchName,
            Scenario = "normal",
            Counters = counters,
            Services = services,
            Waiting = [],
            OpenPerService = [],
        };
        ApplyScenario(demo, "normal");
        return demo;
    }

    private void ApplyScenario(BranchDemo demo, string scenario)
    {
        demo.Scenario = scenario;
        var active = demo.Counters.Where(c => c.IsActive).ToList();

        demo.OpenPerService = demo.Services.ToDictionary(
            s => s.ServiceTypeId,
            s => active.Count(c => c.Supported.Contains(s.ServiceTypeId)));

        demo.Waiting = scenario switch
        {
            // Tushlik cho'qqisi: to'lovlar portlaydi, boshqalar ham gavjum
            "lunch_peak" => demo.Services.ToDictionary(
                s => s.ServiceTypeId,
                s => s.ServiceTypeId switch
                {
                    1 => 14, 2 => 6, 3 => 4, 4 => 3, 5 => 5,
                    _ => 2,
                }),
            // Oddiy kun: kichik navbatlar
            _ => demo.Services.ToDictionary(
                s => s.ServiceTypeId,
                s => _rng.Next(0, 4)),
        };
    }

    public async Task<BranchState> GetStateAsync(int branchId)
    {
        var demo = _branches.GetOrAdd(branchId, _ => LoadAsync(branchId).GetAwaiter().GetResult());

        // Kichik jonli jitter (chegaralangan)
        foreach (var key in demo.Waiting.Keys.ToList())
        {
            var delta = _rng.Next(-1, 2);
            var floor = demo.Scenario == "lunch_peak" && key == 1 ? 10 : 0;
            demo.Waiting[key] = Math.Max(floor, demo.Waiting[key] + delta);
        }

        return Snapshot(branchId, demo);
    }

    public async Task<BranchState> SetScenarioAsync(int branchId, string scenario)
    {
        var demo = _branches.GetOrAdd(branchId, _ => LoadAsync(branchId).GetAwaiter().GetResult());
        ApplyScenario(demo, scenario);
        return Snapshot(branchId, demo);
    }

    private BranchState Snapshot(int branchId, BranchDemo demo)
    {
        var queues = demo.Services.Select(s =>
        {
            var waiting = demo.Waiting.GetValueOrDefault(s.ServiceTypeId);
            var open = demo.OpenPerService.GetValueOrDefault(s.ServiceTypeId);
            var estWait = open > 0 ? waiting * s.AvgSec / open / 60.0 : waiting * s.AvgSec / 60.0;
            double? arrivals = demo.Scenario == "lunch_peak"
                ? s.Share * 130.0   // cho'qqi soatdagi taxminiy oqim
                : s.Share * 60.0;
            return new ServiceQueueState(s.ServiceTypeId, s.Name, waiting, open,
                s.AvgSec, Math.Round(estWait, 1), arrivals);
        }).ToList();

        var counters = demo.Counters.Select(c =>
        {
            var isOpen = c.IsActive;
            var busy = isOpen && queues.Any(q =>
                c.Supported.Contains(q.ServiceTypeId) && q.Waiting > 0);
            return new CounterState(c.CounterId, c.Number, c.Name, isOpen,
                !isOpen ? "closed" : busy ? "serving" : "idle", c.Supported);
        }).ToList();

        var totalWaiting = queues.Sum(q => q.Waiting);
        var avgWait = queues.Count > 0
            ? Math.Round(queues.Where(q => q.Waiting > 0).Select(q => q.EstWaitMin)
                .DefaultIfEmpty(0).Average(), 1)
            : 0;

        return new BranchState(branchId, demo.BranchName, demo.Scenario,
            DateTimeOffset.UtcNow, counters, queues, avgWait, totalWaiting);
    }
}
