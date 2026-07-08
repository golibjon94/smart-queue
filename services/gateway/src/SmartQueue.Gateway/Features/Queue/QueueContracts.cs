namespace SmartQueue.Gateway.Features.Queue;

// --- Navbat holati (dashboard uchun) ---

public sealed record CounterState(
    int CounterId,
    int Number,
    string? Name,
    bool IsOpen,
    string Status,              // serving | idle | closed
    int[] SupportedServiceTypes);

public sealed record ServiceQueueState(
    int ServiceTypeId,
    string Name,
    int Waiting,
    int OpenCounters,
    double AvgServiceSec,
    double EstWaitMin,
    double? ArrivalsPerHour);

public sealed record BranchState(
    int BranchId,
    string BranchName,
    string Scenario,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<CounterState> Counters,
    IReadOnlyList<ServiceQueueState> Queues,
    double AvgWaitMin,
    int TotalWaiting);

// --- So'rov DTO'lari ---

public sealed record ScenarioRequest(int BranchId, string Scenario);

// --- Referens ma'lumot yozuvlari (persistence) ---

public sealed record CounterRow(
    int CounterId, int Number, string? Name, bool IsActive, int[] Supported);

public sealed record ServiceTypeRow(int ServiceTypeId, string Name, double AvgServiceSec);
