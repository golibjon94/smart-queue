using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SmartQueue.Gateway.Common;
using SmartQueue.Gateway.Configuration;
using SmartQueue.Gateway.Features.Auth;
using SmartQueue.Gateway.Features.Queue;
using SmartQueue.Gateway.Features.Recommendations;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Extensions;

/// <summary>Program.cs'ni yupqa saqlash uchun DI ro'yxatga olish kengaytmalari.</summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Flat env kalitlaridan (docker-compose / .env bilan mos) typed Options'ga
    /// bog'laydi va startup'da validatsiya qiladi.
    /// </summary>
    public static IServiceCollection AddGatewayConfiguration(
        this IServiceCollection services, IConfiguration cfg)
    {
        services.AddOptions<DatabaseOptions>()
            .Configure(o =>
            {
                o.Host = cfg["POSTGRES_HOST"] ?? o.Host;
                if (int.TryParse(cfg["POSTGRES_PORT"], out var port)) o.Port = port;
                o.Username = cfg["POSTGRES_USER"] ?? o.Username;
                o.Password = cfg["POSTGRES_PASSWORD"] ?? o.Password;
                o.Database = cfg["POSTGRES_DB"] ?? o.Database;
            })
            .ValidateDataAnnotations().ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Configure(o =>
            {
                // Dev fallback (prod'da JWT_KEY env orqali majburiy beriladi).
                o.Key = cfg["JWT_KEY"] ?? "dev-only-super-secret-jwt-signing-key-change-me-32b+";
                if (int.TryParse(cfg["JWT_EXPIRY_HOURS"], out var hours)) o.ExpiryHours = hours;
            })
            .ValidateDataAnnotations().ValidateOnStart();

        services.AddOptions<MlServiceOptions>()
            .Configure(o => o.BaseUrl = cfg["ML_SERVICE_URL"] ?? o.BaseUrl)
            .ValidateDataAnnotations().ValidateOnStart();

        services.AddOptions<AdminOptions>()
            .Configure(o =>
            {
                o.Username = cfg["DEFAULT_ADMIN_USERNAME"] ?? o.Username;
                o.Password = cfg["DEFAULT_ADMIN_PASSWORD"] ?? o.Password;
            });

        return services;
    }

    /// <summary>NpgsqlDataSource (connection pooling) va data-access repozitoriylari.</summary>
    public static IServiceCollection AddGatewayDatabase(this IServiceCollection services)
    {
        services.AddSingleton(sp =>
        {
            var options = sp.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            return NpgsqlDataSource.Create(options.BuildConnectionString());
        });

        // Repozitoriylar holatsiz va faqat singleton NpgsqlDataSource'ga bog'liq.
        services.AddSingleton<UserRepository>();
        services.AddSingleton<ReferenceDataRepository>();
        services.AddSingleton<RecommendationRepository>();

        return services;
    }

    /// <summary>Ilova servislari (auth, demo state, tavsiya, ML klient) + MVC controller'lar.</summary>
    public static IServiceCollection AddGatewayServices(this IServiceCollection services)
    {
        services.AddControllers();

        services.AddSingleton<JwtTokenGenerator>();
        services.AddScoped<AuthService>();

        services.AddSingleton<DemoStateService>();
        services.AddScoped<RecommendationService>();

        services.AddHttpClient<MlClient>((sp, http) =>
        {
            var ml = sp.GetRequiredService<IOptions<MlServiceOptions>>().Value;
            http.BaseAddress = new Uri(ml.BaseUrl);
            http.Timeout = TimeSpan.FromSeconds(ml.TimeoutSeconds);
        });

        return services;
    }

    /// <summary>JWT bearer autentifikatsiya + avtorizatsiya.</summary>
    public static IServiceCollection AddGatewayAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        // TokenValidationParameters'ni typed JwtOptions'dan sozlaymiz.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>CORS: dashboard origin'iga ruxsat.</summary>
    public static IServiceCollection AddGatewayCors(
        this IServiceCollection services, IConfiguration cfg)
    {
        var origin = cfg["DASHBOARD_ORIGIN"] ?? "http://localhost:4300";
        services.AddCors(o => o.AddDefaultPolicy(policy =>
            policy.WithOrigins(origin).AllowAnyHeader().AllowAnyMethod()));
        return services;
    }

    /// <summary>Global istisno ishlovchisi + ProblemDetails.</summary>
    public static IServiceCollection AddGatewayErrorHandling(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();
        return services;
    }
}
