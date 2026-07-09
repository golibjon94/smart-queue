namespace SmartQueue.Gateway.Features.Simulate;

// What-if simulyatsiya (FAZA2_UMUMIY §4). Angular camelCase yuboradi/kutadi;
// Gateway ML snake_case bilan ichkarida ishlaydi (Infrastructure/Ml).

// --- So'rov (dashboard → Gateway) ---

public sealed record SimulateScenarioRequest(
    int OpenCounters,            // menejer slayderda tanlagan kassa soni
    double? ArrivalsPerHour,     // null -> joriy forecast'dan
    double? AvgServiceSec);      // null -> tarixiy o'rtachadan

public sealed record SimulateRequest(
    int BranchId,
    int? ServiceTypeId,          // null -> filial jami
    SimulateScenarioRequest Scenario);

// --- Javob (Gateway → dashboard, camelCase) ---

public sealed record SimulateSnapshot(
    int OpenCounters,
    int AvgWaitSec,
    double Utilization,
    double ProbWait);

public sealed record SimulateDelta(
    int WaitReductionSec,
    int WaitReductionPct);

public sealed record SimulateResult(
    int BranchId,
    int? ServiceTypeId,
    SimulateSnapshot Baseline,   // joriy holat (o'zgartirishsiz)
    SimulateSnapshot Scenario,   // slayder qiymati bilan
    SimulateDelta Delta);
