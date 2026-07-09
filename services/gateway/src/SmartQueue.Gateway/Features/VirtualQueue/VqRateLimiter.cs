using System.Collections.Concurrent;

namespace SmartQueue.Gateway.Features.VirtualQueue;

/// <summary>
/// Oddiy abuse himoyasi: bir kalit (IP + filial) soniyada bittadan ortiq
/// `join` qila olmaydi — cheksiz talon yaratishning oldini oladi. Singleton,
/// thread-safe. Demo uchun yengil (tashqi bog'liqliksiz).
/// </summary>
public sealed class VqRateLimiter
{
    private readonly ConcurrentDictionary<string, long> _lastTicks = new();
    private const long MinIntervalMs = 1000;

    /// <summary>true bo'lsa so'rovga ruxsat; false bo'lsa juda tez-tez (throttle).</summary>
    public bool TryAcquire(string key)
    {
        var now = Environment.TickCount64;
        var allowed = true;
        _lastTicks.AddOrUpdate(key, now, (_, prev) =>
        {
            if (now - prev < MinIntervalMs)
            {
                allowed = false;
                return prev;
            }
            return now;
        });
        return allowed;
    }
}
