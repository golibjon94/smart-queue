using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>
/// Real-vaqt navbat hub'i: /hubs/queue.
/// Menejer: `JoinBranch`/`LeaveBranch` orqali `branch-{id}` guruhiga obuna bo'ladi
/// (JWT talab qilinadi — token query-string'dagi access_token'dan).
/// Mijoz (Faza 2 QR): `JoinTicket`/`LeaveTicket` orqali `vq-{token}` guruhiga obuna
/// bo'ladi — login yo'q (public), faqat token bilan.
/// Ulanish darajasida avtorizatsiya yo'q; himoya metod darajasida (`[Authorize]`).
/// </summary>
public sealed class QueueHub(BranchRegistry registry) : Hub
{
    public static string Group(int branchId) => $"branch-{branchId}";
    public static string TicketGroup(string token) => $"vq-{token}";

    // --- Menejer (JWT bilan) ---

    [Authorize]
    public async Task JoinBranch(int branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(branchId));
        registry.Add(Context.ConnectionId, branchId);
    }

    [Authorize]
    public async Task LeaveBranch(int branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(branchId));
        registry.Remove(Context.ConnectionId, branchId);
    }

    // --- Mijoz (Faza 2 QR, public — faqat token) ---

    public Task JoinTicket(string token) =>
        Groups.AddToGroupAsync(Context.ConnectionId, TicketGroup(token));

    public Task LeaveTicket(string token) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, TicketGroup(token));

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        registry.RemoveConnection(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
