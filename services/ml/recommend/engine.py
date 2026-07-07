"""Tavsiya dvigateli (Faza 0: sodda qoidalar + Erlang-C).

Har tavsiya majburiy formatda: ACTION + REASON + EXPECTED BENEFIT.
Tavsiyalar recommendations jadvaliga 'proposed' statusi bilan yoziladi.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from .erlang import avg_wait_sec

WAIT_THRESHOLD_SEC = 600      # 10 daqiqadan ortiq kutish -> harakat kerak
MIN_BENEFIT_SEC = 180         # tavsiya faqat >= 3 daqiqa foyda bersa
IDLE_CLOSE_THRESHOLD = 2      # navbat bo'sh bo'lsa va 2+ kassa ochiq bo'lsa -> yopish taklifi


@dataclass
class ServiceState:
    service_type_id: int
    waiting: int                    # hozir navbatda turganlar
    open_counters: int              # shu xizmatga ochiq kassalar
    arrivals_per_hour: float | None = None  # ma'lum bo'lsa (forecast'dan)


def _estimate_wait(lam: float, mu: float, c: int, waiting: int,
                   avg_service_sec: float) -> float:
    """Joriy holat uchun kutish bahosi: statsionar Wq va backlog'ni
    to'g'ridan-to'g'ri eritish vaqtining kattasi."""
    stationary = avg_wait_sec(lam, mu, c) if c > 0 else float("inf")
    drain = waiting * avg_service_sec / max(c, 1)
    if stationary == float("inf"):
        return max(drain, WAIT_THRESHOLD_SEC * 2)
    return max(stationary, drain)


def make_recommendations(conn, branch_id: int, states: list[ServiceState]) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT service_type_id, name, avg_service_time_sec FROM service_types")
        svc = {r[0]: {"name": r[1], "avg_sec": r[2]} for r in cur.fetchall()}
        cur.execute(
            """SELECT counter_id, number, name, is_active, supported_service_types
               FROM counters WHERE branch_id = %s ORDER BY number""",
            (branch_id,),
        )
        counters = cur.fetchall()

    # Ochilishi mumkin bo'lgan zaxira kassalar (hozir faol emas)
    reserve = [
        {"counter_id": r[0], "number": r[1], "name": r[2], "supported": set(r[4] or [])}
        for r in counters if not r[3]
    ]

    recs: list[dict] = []
    for st in states:
        info = svc.get(st.service_type_id)
        if info is None:
            continue
        avg_sec = float(info["avg_sec"])
        mu = 1.0 / avg_sec
        lam = ((st.arrivals_per_hour or max(st.waiting * 2.0, 1.0)) / 3600.0)
        est_wait = _estimate_wait(lam, mu, st.open_counters, st.waiting, avg_sec)

        # QOIDA 1: kutish chegaradan oshdi -> zaxira kassa ochish
        if est_wait > WAIT_THRESHOLD_SEC:
            candidate = next(
                (r for r in reserve if st.service_type_id in r["supported"]), None)
            if candidate is not None:
                new_wait = _estimate_wait(lam, mu, st.open_counters + 1,
                                          st.waiting, avg_sec)
                benefit = est_wait - new_wait
                if benefit >= MIN_BENEFIT_SEC:
                    reserve.remove(candidate)
                    recs.append({
                        "action_type": "open_counter",
                        "action": f"{candidate['number']}-kassani oching",
                        "reason": (f"«{info['name']}» navbatida {st.waiting} kishi, "
                                   f"taxminiy kutish ~{est_wait / 60:.0f} daqiqa"),
                        "expected_benefit": {
                            "wait_reduction_min": round(benefit / 60, 1),
                            "wait_before_min": round(est_wait / 60, 1),
                            "wait_after_min": round(new_wait / 60, 1),
                        },
                        "action_payload": {
                            "counter_id": candidate["counter_id"],
                            "counter_number": candidate["number"],
                            "service_type_id": st.service_type_id,
                        },
                    })
            continue

        # QOIDA 2: navbat bo'sh, kassalar ortiqcha -> bittasini bo'shatish
        if st.waiting == 0 and st.open_counters >= IDLE_CLOSE_THRESHOLD:
            new_wait = _estimate_wait(lam, mu, st.open_counters - 1, 0, avg_sec)
            if new_wait < WAIT_THRESHOLD_SEC / 2:
                recs.append({
                    "action_type": "close_counter",
                    "action": f"«{info['name']}» kassalaridan bittasini boshqa ishga o'tkazing",
                    "reason": f"«{info['name']}» navbati bo'sh, {st.open_counters} ta kassa ochiq",
                    "expected_benefit": {
                        "freed_counters": 1,
                        "wait_after_min": round(new_wait / 60, 1),
                    },
                    "action_payload": {"service_type_id": st.service_type_id},
                })

    _persist(conn, branch_id, recs)
    return recs


def _persist(conn, branch_id: int, recs: list[dict]) -> None:
    if not recs:
        return
    with conn.cursor() as cur:
        for r in recs:
            cur.execute(
                """INSERT INTO recommendations
                   (branch_id, action_type, action_payload, reason, expected_benefit)
                   VALUES (%s, %s, %s, %s, %s) RETURNING rec_id, generated_at""",
                (branch_id, r["action_type"],
                 json.dumps(r["action_payload"], ensure_ascii=False),
                 r["reason"],
                 json.dumps(r["expected_benefit"], ensure_ascii=False)),
            )
            rec_id, generated_at = cur.fetchone()
            r["rec_id"] = rec_id
            r["generated_at"] = generated_at.isoformat()
            r["status"] = "proposed"
    conn.commit()
