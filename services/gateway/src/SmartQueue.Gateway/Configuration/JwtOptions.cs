using System.ComponentModel.DataAnnotations;

namespace SmartQueue.Gateway.Configuration;

/// <summary>JWT imzolash sozlamalari (HS256 — kalit kamida 32 belgi).</summary>
public sealed class JwtOptions
{
    [Required]
    [MinLength(32, ErrorMessage = "JWT_KEY HS256 uchun kamida 32 belgidan bo'lishi kerak.")]
    public string Key { get; set; } = default!;

    public string Issuer { get; set; } = "smart-queue";

    public string Audience { get; set; } = "smart-queue-dashboard";

    [Range(1, 168)]
    public int ExpiryHours { get; set; } = 8;
}
