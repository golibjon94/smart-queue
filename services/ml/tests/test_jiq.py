"""JIQ (Join-the-Idle-Queue) marshrutlash mantig'i uchun unit testlar.

_build_recommendations sof funksiya — DB'siz tekshiriladi.
"""
from recommend.engine import CounterState, ServiceState, _build_recommendations

SVC = {
    1: {"name": "To'lovlar", "avg_sec": 240},
    2: {"name": "Ma'lumot", "avg_sec": 180},
}


def _states(**kw):
    return [ServiceState(service_type_id=kw.get("sid", 1),
                         waiting=kw.get("waiting", 8),
                         open_counters=kw.get("open", 1))]


def test_routes_waiting_queue_to_idle_counter():
    counters = [
        CounterState(counter_id=5, number=5, status="idle",
                     supported_service_types=[1, 2]),
        CounterState(counter_id=6, number=6, status="serving",
                     supported_service_types=[1]),
    ]
    recs = _build_recommendations(SVC, [], counters, _states(sid=1, waiting=8))
    assert len(recs) == 1
    r = recs[0]
    assert r["action_type"] == "route_queue"
    assert r["action_payload"] == {
        "service_type_id": 1, "to_counter_id": 5, "to_counter_number": 5,
    }
    assert r["expected_benefit"]["wait_reduction_min"] > 0


def test_skill_mismatch_no_route():
    """Bo'sh kassa xizmatni qo'llab-quvvatlamasa -> yo'naltirish yo'q."""
    counters = [CounterState(counter_id=7, number=7, status="idle",
                             supported_service_types=[2])]
    recs = _build_recommendations(SVC, [], counters, _states(sid=1, waiting=8))
    assert all(r["action_type"] != "route_queue" for r in recs)


def test_serving_counter_is_not_a_route_target():
    counters = [CounterState(counter_id=8, number=8, status="serving",
                             supported_service_types=[1])]
    recs = _build_recommendations(SVC, [], counters, _states(sid=1, waiting=8))
    assert recs == []


def test_one_idle_counter_serves_only_one_queue():
    """Bitta bo'sh kassa ikki navbatga bo'linmaydi — faqat biri yo'naltiriladi."""
    counters = [CounterState(counter_id=5, number=5, status="idle",
                             supported_service_types=[1, 2])]
    states = [
        ServiceState(service_type_id=1, waiting=8, open_counters=1),
        ServiceState(service_type_id=2, waiting=8, open_counters=1),
    ]
    recs = _build_recommendations(SVC, [], counters, states)
    routes = [r for r in recs if r["action_type"] == "route_queue"]
    assert len(routes) == 1


def test_route_preempts_open_counter_no_conflict():
    """Bo'sh kassaga yo'naltirilsa, o'sha xizmat uchun kassa ochish taklif etilmaydi."""
    reserve = [{"counter_id": 9, "number": 9, "name": "9", "supported": {1}}]
    counters = [CounterState(counter_id=5, number=5, status="idle",
                             supported_service_types=[1])]
    recs = _build_recommendations(SVC, reserve, counters, _states(sid=1, waiting=12))
    assert len(recs) == 1
    assert recs[0]["action_type"] == "route_queue"


def test_backward_compatible_without_counters():
    """counters berilmasa (eski xatti-harakat) -> open_counter qoidasi ishlaydi."""
    reserve = [{"counter_id": 9, "number": 9, "name": "9", "supported": {1}}]
    recs = _build_recommendations(SVC, reserve, [], _states(sid=1, waiting=12))
    assert any(r["action_type"] == "open_counter" for r in recs)
    assert all(r["action_type"] != "route_queue" for r in recs)
