using System.ComponentModel.DataAnnotations;

namespace SmartQueue.Gateway.Configuration;

/// <summary>Python ML servisi (FastAPI) uchun HTTP klient sozlamalari.</summary>
public sealed class MlServiceOptions
{
    [Required]
    [Url]
    public string BaseUrl { get; set; } = "http://localhost:8000";

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 15;
}
