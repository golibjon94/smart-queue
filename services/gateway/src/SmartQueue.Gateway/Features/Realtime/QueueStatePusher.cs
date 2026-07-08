using Microsoft.Extensions.Options;
using SmartQueue.Gateway.Configuration;
using SmartQueue.Gateway.Features.Queue;

namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>
/// Davriy background pusher: har N soniyada faol filial guruhlariga
/// `queueStateUpdated` yuboradi — dashboarddagi HTTP pollingni almashtiradi.
/// </summary>
public sealed class QueueStatePusher(
    BranchRegistry registry,
    IRealtimeNotifier notifier,
    DemoStateService demo,
    IOptions<RealtimeOptions> options,
    ILogger<QueueStatePusher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(options.Value.PusherIntervalSeconds);
        log.LogInformation("QueueStatePusher ishga tushdi (interval {Interval}s)", interval.TotalSeconds);

        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            foreach (var branchId in registry.ActiveBranches())
            {
                try
                {
                    var state = await demo.GetStateAsync(branchId, stoppingToken);
                    await notifier.QueueStateUpdatedAsync(branchId, state, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    log.LogWarning(ex, "Filial {BranchId} holatini push qilishda xato", branchId);
                }
            }
        }
    }
}
