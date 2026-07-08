namespace SmartQueue.Gateway.Common;

/// <summary>
/// Validatsiya / autentifikatsiya xatolari uchun oddiy javob shakli
/// ({ "error": "..." }) — dashboard shu maydonni kutadi.
/// </summary>
public sealed record ErrorResponse(string Error);
