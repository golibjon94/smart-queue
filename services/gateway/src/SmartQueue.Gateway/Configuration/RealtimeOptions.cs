using System.ComponentModel.DataAnnotations;

namespace SmartQueue.Gateway.Configuration;

/// <summary>
/// Real-vaqt (SignalR) sozlamalari: background pusher intervali va ixtiyoriy
/// Redis backplane (bir nechta instansiyada masshtablash uchun).
/// </summary>
public sealed class RealtimeOptions
{
    [Range(1, 60)]
    public int PusherIntervalSeconds { get; set; } = 4;

    /// <summary>Bo'sh bo'lmasa — SignalR Redis backplane yoqiladi (aks holda in-memory).</summary>
    public string? RedisConnection { get; set; }

    public bool RedisEnabled => !string.IsNullOrWhiteSpace(RedisConnection);
}
