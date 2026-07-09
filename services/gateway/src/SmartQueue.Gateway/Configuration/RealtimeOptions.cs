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

    // Redis backplane REDIS_HOST env orqali AddGatewayRealtime'da to'g'ridan-to'g'ri
    // sozlanadi (registratsiya vaqtida ulanish satri kerak bo'lgani uchun).
}
