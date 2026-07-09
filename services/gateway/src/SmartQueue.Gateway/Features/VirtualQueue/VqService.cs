using System.Security.Cryptography;
using SmartQueue.Gateway.Features.Queue;
using SmartQueue.Gateway.Features.Realtime;
using SmartQueue.Gateway.Infrastructure.Ml;

namespace SmartQueue.Gateway.Features.VirtualQueue;

/// <summary>
/// QR virtual navbat lifecycle'i (FAZA2_UMUMIY §5): join/status/leave, pozitsiya
/// hisobi (virtual + fizik birga), ML orqali forecast-tuzatilgan ETA va SignalR
/// `vqPositionUpdated` push. Fizik navbat holati demo servisidan olinadi.
/// </summary>
public sealed class VqService(
    VqRepository repository,
    DemoStateService demo,
    MlClient ml,
    IRealtimeNotifier notifier,
    ILogger<VqService> log)
{
    private const string TokenAlphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private const int TokenLength = 8;

    /// <summary>Yangi virtual talon yaratadi, boshlang'ich pozitsiya/ETA qaytaradi.</summary>
    public async Task<VqJoinResult> JoinAsync(
        int branchId, int serviceTypeId, CancellationToken ct = default)
    {
        var svc = await GetServiceInfoAsync(branchId, serviceTypeId, ct);

        // Yangi talon barcha joriy kutayotganlar (fizik + virtual) ketidan turadi.
        var virtualWaiting = await repository.CountWaitingAsync(branchId, serviceTypeId, ct);
        var position = svc.PhysicalWaiting + virtualWaiting + 1;

        var seq = await repository.CountForBranchAsync(branchId, ct) + 1;
        var ticketNumber = $"V{seq:D3}";
        var token = await GenerateUniqueTokenAsync(ct);

        await repository.InsertAsync(token, ticketNumber, branchId, serviceTypeId, ct);

        var etaSec = await ComputeEtaAsync(branchId, serviceTypeId, position, svc, ct);

        var status = new VqStatus(token, ticketNumber, branchId, serviceTypeId,
            position, etaSec, "waiting");
        await notifier.VqPositionUpdatedAsync(token, status, ct);

        return new VqJoinResult(token, ticketNumber, branchId, serviceTypeId,
            position, etaSec, "waiting");
    }

    /// <summary>Token bo'yicha joriy holat (pozitsiya qayta hisoblanadi). Topilmasa null.</summary>
    public async Task<VqStatus?> GetStatusAsync(string token, CancellationToken ct = default)
    {
        var ticket = await repository.GetByTokenAsync(token, ct);
        if (ticket is null)
            return null;

        // Yakuniy holatda (abandoned/completed) pozitsiya endi ahamiyatsiz.
        if (ticket.Status != "waiting")
            return new VqStatus(ticket.Token, ticket.TicketNumber, ticket.BranchId,
                ticket.ServiceTypeId, 0, 0, ticket.Status);

        var svc = await GetServiceInfoAsync(ticket.BranchId, ticket.ServiceTypeId, ct);
        var ahead = await repository.CountWaitingBeforeAsync(
            ticket.BranchId, ticket.ServiceTypeId, ticket.JoinedAt, ct);
        var position = svc.PhysicalWaiting + ahead + 1;
        var etaSec = await ComputeEtaAsync(
            ticket.BranchId, ticket.ServiceTypeId, position, svc, ct);

        return new VqStatus(ticket.Token, ticket.TicketNumber, ticket.BranchId,
            ticket.ServiceTypeId, position, etaSec, ticket.Status);
    }

    /// <summary>Mijoz navbatdan chiqadi (waiting -> abandoned). Topilmasa null.</summary>
    public async Task<VqStatus?> LeaveAsync(string token, CancellationToken ct = default)
    {
        var ticket = await repository.GetByTokenAsync(token, ct);
        if (ticket is null)
            return null;

        await repository.SetStatusAsync(token, "abandoned", ct);
        var status = new VqStatus(ticket.Token, ticket.TicketNumber, ticket.BranchId,
            ticket.ServiceTypeId, 0, 0, "abandoned");
        await notifier.VqPositionUpdatedAsync(token, status, ct);
        return status;
    }

    /// <summary>Menejer dashboardi uchun: filialning faol virtual talonlari.</summary>
    public Task<IReadOnlyList<VqTicketRow>> ListWaitingAsync(
        int branchId, CancellationToken ct = default) =>
        repository.ListWaitingByBranchAsync(branchId, ct);

    /// <summary>
    /// Barcha kutayotgan virtual talonlarning pozitsiya/ETA'sini qayta hisoblab
    /// `vqPositionUpdated` push qiladi (background pusher chaqiradi).
    /// </summary>
    public async Task RefreshAllAsync(CancellationToken ct = default)
    {
        var waiting = await repository.ListWaitingAsync(ct);
        if (waiting.Count == 0)
            return;

        foreach (var branchGroup in waiting.GroupBy(t => t.BranchId))
        {
            ServiceInfoMap svcMap;
            try
            {
                svcMap = await LoadServiceMapAsync(branchGroup.Key, ct);
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Filial {BranchId} holatini o'qishda xato (vq pusher)", branchGroup.Key);
                continue;
            }

            foreach (var svcGroup in branchGroup.GroupBy(t => t.ServiceTypeId))
            {
                var svc = svcMap.For(svcGroup.Key);
                var index = 0;   // joined_at bo'yicha tartib (ListWaitingAsync tartiblaydi)
                foreach (var ticket in svcGroup)
                {
                    var position = svc.PhysicalWaiting + index + 1;
                    index++;
                    var etaSec = await ComputeEtaAsync(
                        ticket.BranchId, ticket.ServiceTypeId, position, svc, ct);
                    var status = new VqStatus(ticket.Token, ticket.TicketNumber, ticket.BranchId,
                        ticket.ServiceTypeId, position, etaSec, ticket.Status);
                    await notifier.VqPositionUpdatedAsync(ticket.Token, status, ct);
                }
            }
        }
    }

    // --- Ichki yordamchilar ---

    private readonly record struct ServiceInfo(int PhysicalWaiting, int OpenCounters, double AvgServiceSec);

    private sealed class ServiceInfoMap(IReadOnlyDictionary<int, ServiceInfo> byService, ServiceInfo fallback)
    {
        public ServiceInfo For(int serviceTypeId) =>
            byService.TryGetValue(serviceTypeId, out var info) ? info : fallback;
    }

    private async Task<ServiceInfo> GetServiceInfoAsync(
        int branchId, int serviceTypeId, CancellationToken ct)
    {
        var map = await LoadServiceMapAsync(branchId, ct);
        return map.For(serviceTypeId);
    }

    private async Task<ServiceInfoMap> LoadServiceMapAsync(int branchId, CancellationToken ct)
    {
        var state = await demo.GetStateAsync(branchId, ct);
        var byService = state.Queues.ToDictionary(
            q => q.ServiceTypeId,
            q => new ServiceInfo(q.Waiting, q.OpenCounters, q.AvgServiceSec));
        // Xizmat turi topilmasa oqilona zaxira (ochiq kassa >= 1).
        var fallback = new ServiceInfo(0, 1, 300);
        return new ServiceInfoMap(byService, fallback);
    }

    /// <summary>ML `/eta` orqali (forecast tuzatilgan). ML yetib bo'lmasa oddiy baza formulasi.</summary>
    private async Task<int> ComputeEtaAsync(
        int branchId, int serviceTypeId, int position, ServiceInfo svc, CancellationToken ct)
    {
        var openCounters = Math.Max(svc.OpenCounters, 1);
        try
        {
            var resp = await ml.EtaAsync(new MlEtaRequest(
                branchId, serviceTypeId, position, openCounters, svc.AvgServiceSec, null), ct);
            if (resp is not null)
                return resp.EtaSec;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "ML ETA chaqirig'i muvaffaqiyatsiz — baza formulasi ishlatiladi");
        }
        // Zaxira: forecast tuzatishisiz baza (demo hech qachon buzilmaydi).
        return (int)Math.Round(position * svc.AvgServiceSec / openCounters);
    }

    private async Task<string> GenerateUniqueTokenAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var token = GenerateToken();
            if (await repository.GetByTokenAsync(token, ct) is null)
                return token;
        }
        // Deyarli imkonsiz — 62^8 makon; qo'shimcha uzunlik bilan kafolatlaymiz.
        return GenerateToken() + GenerateToken()[..4];
    }

    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[TokenLength];
        RandomNumberGenerator.Fill(bytes);
        Span<char> chars = stackalloc char[TokenLength];
        for (var i = 0; i < TokenLength; i++)
            chars[i] = TokenAlphabet[bytes[i] % TokenAlphabet.Length];
        return new string(chars);
    }
}
