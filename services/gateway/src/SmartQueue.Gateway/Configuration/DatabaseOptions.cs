using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace SmartQueue.Gateway.Configuration;

/// <summary>
/// PostgreSQL / TimescaleDB ulanish sozlamalari. Flat env kalitlaridan
/// (POSTGRES_HOST, POSTGRES_PORT, ...) bog'lanadi — docker-compose va .env
/// bilan mos qoladi.
/// </summary>
public sealed class DatabaseOptions
{
    [Required]
    public string Host { get; set; } = "localhost";

    [Range(1, 65535)]
    public int Port { get; set; } = 5433;

    [Required]
    public string Username { get; set; } = "smartqueue";

    public string Password { get; set; } = "";

    [Required]
    public string Database { get; set; } = "smartqueue";

    public string BuildConnectionString() => new NpgsqlConnectionStringBuilder
    {
        Host = Host,
        Port = Port,
        Username = Username,
        Password = Password,
        Database = Database,
    }.ConnectionString;
}
