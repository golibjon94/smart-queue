namespace SmartQueue.Gateway.Features.VirtualQueue;

// QR virtual navbat (FAZA2_UMUMIY §5). Barcha javoblar camelCase.

// --- So'rov (mijoz → Gateway, public) ---

public sealed record VqJoinRequest(int BranchId, int ServiceTypeId);

// --- Javob (Gateway → mijoz, camelCase) ---

/// <summary>Join javobi: token + boshlang'ich pozitsiya/ETA.</summary>
public sealed record VqJoinResult(
    string Token,
    string TicketNumber,
    int BranchId,
    int ServiceTypeId,
    int Position,
    int EtaSec,
    string Status);

/// <summary>Holat javobi (status endpoint) va SignalR `vqPositionUpdated` payload'i.</summary>
public sealed record VqStatus(
    string Token,
    string TicketNumber,
    int BranchId,
    int ServiceTypeId,
    int Position,
    int EtaSec,
    string Status);

// --- Persistence yozuvi ---

public sealed record VqTicketRow(
    string Token,
    string TicketNumber,
    int BranchId,
    int ServiceTypeId,
    string Status,
    DateTimeOffset JoinedAt);
