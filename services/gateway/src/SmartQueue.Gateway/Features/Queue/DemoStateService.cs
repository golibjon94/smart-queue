using System.Collections.Concurrent;

namespace SmartQueue.Gateway.Features.Queue;

/// <summary>
/// Faza 0 demo holati: filial navbatlarining joriy "jonli" holatini xotirada
/// saqlaydi. Ssenariylar: normal | lunch_peak. Har o'qishda kichik jitter
/// qo'shiladi — dashboard jonli ko'rinadi.
/// (Faza 2 da bu servis o'rnini real iQueue ma'lumoti egallaydi.)
///
/// Singleton sifatida ro'yxatga olinadi, shuning uchun holat mutatsiyasi
/// har filial uchun lock bilan himoyalangan; yuklash SemaphoreSlim orqali.
/// </summary>
public sealed class DemoStateService(ReferenceDataRepository reference)
{
    private readonly ConcurrentDictionary<int, BranchDemo> _branches = new();
    private readonly SemaphoreSlim _loadGate = new(1, 1);

    // seed_reference.sql / simulation config.py dagi ulushlarga mos
    private static readonly IReadOnlyDictionary<int, double> Shares = new Dictionary<int, double>
    {
        [1] = 0.40, [2] = 0.15, [3] = 0.15, [4] = 0.10, [5] = 0.20,
    };

    private sealed class BranchDemo
    {
        public required string BranchName { get; init; }
        public required IReadOnlyList<CounterRow> Counters { get; init; }
        public required IReadOnlyList<ServiceTypeRow> Services { get; init; }
        public required IReadOnlyDictionary<int, double> Shares { get; init; }
        public string Scenario { get; set; } = "normal";
        public Dictionary<int, int> Waiting { get; set; } = [];
        public Dictionary<int, int> OpenPerService { get; set; } = [];
        public readonly Lock Sync = new();
    }

    public async Task<BranchState> GetStateAsync(int branchId, CancellationToken ct = default)
    {
        var demo = await GetOrLoadAsync(branchId, ct);
        lock (demo.Sync)
        {
            ApplyJitter(demo);
            return Snapshot(branchId, demo);
        }
    }

    public async Task<BranchState> SetScenarioAsync(
        int branchId, string scenario, CancellationToken ct = default)
    {
        var demo = await GetOrLoadAsync(branchId, ct);
        lock (demo.Sync)
        {
            ApplyScenario(demo, scenario);
            return Snapshot(branchId, demo);
        }
    }

    private async Task<BranchDemo> GetOrLoadAsync(int branchId, CancellationToken ct)
    {
        if (_branches.TryGetValue(branchId, out var existing))
            return existing;

        await _loadGate.WaitAsync(ct);
        try
        {
            if (_branches.TryGetValue(branchId, out existing))
                return existing;

            var demo = await LoadAsync(branchId, ct);
            _branches[branchId] = demo;
            return demo;
        }
        finally
        {
            _loadGate.Release();
        }
    }

    private async Task<BranchDemo> LoadAsync(int branchId, CancellationToken ct)
    {
        var branchName = await reference.GetBranchNameAsync(branchId, ct)
            ?? throw new InvalidOperationException($"Filial {branchId} topilmadi");
        var counters = await reference.GetCountersAsync(branchId, ct);
        var services = await reference.GetServiceTypesAsync(ct);

        var demo = new BranchDemo
        {
            BranchName = branchName,
            Counters = counters,
            Services = services,
            Shares = Shares,
        };
        ApplyScenario(demo, "normal");
        return demo;
    }

    private static void ApplyScenario(BranchDemo demo, string scenario)
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
                _ => Random.Shared.Next(0, 4)),
        };
    }

    /// <summary>Kichik jonli jitter (chegaralangan). demo.Sync ostida chaqiriladi.</summary>
    private static void ApplyJitter(BranchDemo demo)
    {
        foreach (var key in demo.Waiting.Keys.ToList())
        {
            var delta = Random.Shared.Next(-1, 2);
            var floor = demo.Scenario == "lunch_peak" && key == 1 ? 10 : 0;
            demo.Waiting[key] = Math.Max(floor, demo.Waiting[key] + delta);
        }
    }

    private static BranchState Snapshot(int branchId, BranchDemo demo)
    {
        var queues = demo.Services.Select(s =>
        {
            var waiting = demo.Waiting.GetValueOrDefault(s.ServiceTypeId);
            var open = demo.OpenPerService.GetValueOrDefault(s.ServiceTypeId);
            var estWait = open > 0
                ? waiting * s.AvgServiceSec / open / 60.0
                : waiting * s.AvgServiceSec / 60.0;
            double? arrivals = demo.Shares.GetValueOrDefault(s.ServiceTypeId, 0.1)
                * (demo.Scenario == "lunch_peak" ? 130.0 : 60.0);
            return new ServiceQueueState(s.ServiceTypeId, s.Name, waiting, open,
                s.AvgServiceSec, Math.Round(estWait, 1), arrivals);
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
