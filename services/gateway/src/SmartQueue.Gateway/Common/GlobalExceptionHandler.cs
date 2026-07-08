using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;

namespace SmartQueue.Gateway.Common;

/// <summary>
/// Ushlanmagan istisnolarni RFC 7807 ProblemDetails ko'rinishida qaytaradi.
/// Ichki xato tafsilotlari mijozga oshkor qilinmaydi (faqat log'da).
/// </summary>
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<GlobalExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        log.LogError(ex, "Ushlanmagan istisno: {Path}", ctx.Request.Path);

        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails =
            {
                Title = "Kutilmagan server xatosi",
                Status = StatusCodes.Status500InternalServerError,
            },
        });
    }
}
