"""Sintetik ma'lumot generatori — CLI.

Ishlatish (services/ml ichidan):
    python -m simulation.generate --days 90 --seed 42 --replace
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta

import numpy as np

from . import db
from .arrivals import nhpp_arrivals
from .config import BRANCHES, DAILY_NOISE_SIGMA, SERVICES
from .intensity import business_hours, hourly_lambda
from .queue_sim import simulate_day


def close_second(d: date) -> float:
    hours = business_hours(d)
    return (max(hours) + 1) * 3600.0 if hours else 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Sintetik navbat ma'lumoti generatori")
    parser.add_argument("--days", type=int, default=90, help="necha kunlik tarix")
    parser.add_argument("--end", type=str, default=None,
                        help="oxirgi kun YYYY-MM-DD (default: kecha)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--replace", action="store_true",
                        help="avval eski sintetik yozuvlarni o'chirish")
    args = parser.parse_args()

    end_day = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)
    start_day = end_day - timedelta(days=args.days - 1)
    rng = np.random.default_rng(args.seed)
    services = {s.service_type_id: s for s in SERVICES}

    conn = db.connect()
    try:
        if args.replace:
            deleted = db.delete_synthetic(conn)
            print(f"O'chirildi: {deleted} eski sintetik hodisa")

        total_events = 0
        total_tickets = 0
        ticket_seq = 1_000_000

        for branch in BRANCHES:
            counters = db.fetch_counters(conn, branch.branch_id)
            if not counters:
                raise SystemExit(f"Filial {branch.branch_id} uchun faol kassa topilmadi — seed yuklandimi?")

            branch_rows: list[tuple] = []
            d = start_day
            while d <= end_day:
                hours = business_hours(d)
                if hours:
                    noise = float(rng.lognormal(0.0, DAILY_NOISE_SIGMA))
                    arrivals: list[tuple[float, int]] = []
                    for svc in SERVICES:
                        lam = hourly_lambda(branch, svc, d, noise)
                        for t in nhpp_arrivals(lam, rng):
                            arrivals.append((float(t), svc.service_type_id))
                    arrivals.sort(key=lambda x: x[0])

                    rows = simulate_day(
                        d, branch.branch_id, arrivals, counters, services,
                        close_second(d), ticket_seq, rng,
                    )
                    ticket_seq += len(arrivals)
                    total_tickets += len(arrivals)
                    branch_rows.extend(r.as_tuple() for r in rows)
                d += timedelta(days=1)

            db.copy_events(conn, branch_rows)
            total_events += len(branch_rows)
            print(f"Filial {branch.branch_id}: {len(branch_rows)} hodisa yozildi")

        db.refresh_hourly_aggregate(conn)
        print(f"\nJami: {total_tickets} talon, {total_events} hodisa "
              f"({start_day} .. {end_day}, seed={args.seed})")
        print("hourly_arrivals yangilandi.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
