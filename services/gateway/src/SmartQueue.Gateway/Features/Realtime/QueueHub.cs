using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>
/// Real-vaqt navbat hub'i: /hubs/queue. Mijoz `JoinBranch`/`LeaveBranch` orqali
/// `branch-{id}` guruhiga obuna bo'ladi; server shu guruhlarga hodisa push qiladi.
/// JWT bilan himoyalangan (token query-string'dagi access_token'dan — WebSocket standarti).
/// </summary>
[Authorize]
public sealed class QueueHub(BranchRegistry registry) : Hub
{
    public static string Group(int branchId) => $"branch-{branchId}";

    public async Task JoinBranch(int branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(branchId));
        registry.Add(Context.ConnectionId, branchId);
    }

    public async Task LeaveBranch(int branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(branchId));
        registry.Remove(Context.ConnectionId, branchId);
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        registry.RemoveConnection(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
