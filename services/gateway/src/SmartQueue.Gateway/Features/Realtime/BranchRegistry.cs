namespace SmartQueue.Gateway.Features.Realtime;

/// <summary>
/// Qaysi filiallarda faol obunachi (SignalR ulanishi) borligini kuzatadi —
/// background pusher faqat shu filiallarga holat yuboradi. Thread-safe.
/// </summary>
public sealed class BranchRegistry
{
    private readonly Lock _sync = new();
    private readonly Dictionary<string, HashSet<int>> _byConnection = new();
    private readonly Dictionary<int, int> _counts = new();

    public void Add(string connectionId, int branchId)
    {
        lock (_sync)
        {
            if (!_byConnection.TryGetValue(connectionId, out var set))
                set = _byConnection[connectionId] = [];
            if (set.Add(branchId))
                _counts[branchId] = _counts.GetValueOrDefault(branchId) + 1;
        }
    }

    public void Remove(string connectionId, int branchId)
    {
        lock (_sync)
        {
            if (_byConnection.TryGetValue(connectionId, out var set) && set.Remove(branchId))
                Decrement(branchId);
        }
    }

    public void RemoveConnection(string connectionId)
    {
        lock (_sync)
        {
            if (_byConnection.Remove(connectionId, out var set))
                foreach (var branchId in set)
                    Decrement(branchId);
        }
    }

    public int[] ActiveBranches()
    {
        lock (_sync)
            return [.. _counts.Keys];
    }

    private void Decrement(int branchId)
    {
        var next = _counts.GetValueOrDefault(branchId) - 1;
        if (next <= 0) _counts.Remove(branchId);
        else _counts[branchId] = next;
    }
}
