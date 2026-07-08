using Microsoft.Extensions.Options;
using SmartQueue.Gateway.Configuration;
using SmartQueue.Gateway.Features.Auth;

namespace SmartQueue.Gateway.Extensions;

/// <summary>HTTP pipeline, endpoint xaritalash va startup seed kengaytmalari.</summary>
public static class WebApplicationExtensions
{
    public static WebApplication UseGatewayPipeline(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }

    /// <summary>Barcha feature controller'larini ro'yxatga oladi (attribute routing).</summary>
    public static WebApplication MapGatewayEndpoints(this WebApplication app)
    {
        app.MapControllers();
        return app;
    }

    /// <summary>Startup'da default admin foydalanuvchisini yaratadi (agar yo'q bo'lsa).</summary>
    public static async Task<WebApplication> SeedDefaultAdminAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
        var admin = scope.ServiceProvider.GetRequiredService<IOptions<AdminOptions>>().Value;
        try
        {
            await auth.EnsureDefaultAdminAsync(admin);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Default admin seed muvaffaqiyatsiz (DB tayyor emasmi?)");
        }
        return app;
    }
}
