namespace SmartQueue.Gateway.Configuration;

/// <summary>
/// Birinchi startup'da yaratiladigan default admin. Keyin DB'da qoladi —
/// parolni almashtirish tavsiya etiladi.
/// </summary>
public sealed class AdminOptions
{
    public string Username { get; set; } = "admin";

    public string Password { get; set; } = "Admin!2026";
}
