namespace SmartQueue.Gateway.Models;

// --- Navbat holati (dashboard uchun) ---

public record CounterState(
    int CounterId,
    int Number,
    string? Name,
    bool IsOpen,
    string Status,              // serving | idle | closed
    int[] SupportedServiceTypes
);

public record ServiceQueueState(
    int ServiceTypeId,
    string Name,
    int Waiting,
    int OpenCounters,
    double AvgServiceSec,
    double EstWaitMin,
    double? ArrivalsPerHour
);

public record BranchState(
    int BranchId,
    string BranchName,
    string Scenario,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<CounterState> Counters,
    IReadOnlyList<ServiceQueueState> Queues,
    double AvgWaitMin,
    int TotalWaiting
);

// --- So'rovlar ---

public record ScenarioRequest(int BranchId, string Scenario);

public record RespondRequest(string Status, int? RespondedBy);

// --- ML servisga proxy uchun ---

public record MlServiceState(int service_type_id, int waiting, int open_counters,
                             double? arrivals_per_hour);

public record MlRecommendationRequest(int branch_id, List<MlServiceState> services);
