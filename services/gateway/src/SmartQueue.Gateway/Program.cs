using SmartQueue.Gateway.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddGatewayConfiguration(builder.Configuration)
    .AddGatewayDatabase()
    .AddGatewayServices()
    .AddGatewayAuthentication()
    .AddGatewayCors(builder.Configuration)
    .AddGatewayErrorHandling();

var app = builder.Build();

await app.SeedDefaultAdminAsync();

app.UseGatewayPipeline();
app.MapGatewayEndpoints();

app.Run();
