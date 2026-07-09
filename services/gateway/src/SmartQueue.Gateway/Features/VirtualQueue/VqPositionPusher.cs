using Microsoft.Extensions.Options;
using SmartQueue.Gateway.Configuration;

namespace SmartQueue.Gateway.Features.VirtualQueue;

/// <summary>
/// Davriy background pusher (Faza 1 `QueueStatePusher` uslubida): har N soniyada
/// barcha kutayotgan virtual talonlarning pozitsiya/ETA'sini qayta hisoblab
/// `vqPositionUpdated` push qiladi. Fizik navbat jitteri yoki boshqa mijozlar
/// chiqishi bilan pozitsiya jonli o'zgaradi.
/// </summary>
public sealed class VqPositionPusher(
    IServiceScopeFactory scopeFactory,
    IOptions<RealtimeOptions> options,
    ILogger<VqPositionPusher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(options.Value.PusherIntervalSeconds);
        log.LogInformation("VqPositionPusher ishga tushdi (interval {Interval}s)", interval.TotalSeconds);

        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                // VqService scoped (MlClient'ga bog'liq) — har tikda yangi scope.
                await using var scope = scopeFactory.CreateAsyncScope();
                var vq = scope.ServiceProvider.GetRequiredService<VqService>();
                await vq.RefreshAllAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Virtual navbat pozitsiyalarini push qilishda xato");
            }
        }
    }
}
