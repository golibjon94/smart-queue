"""Sintetik ma'lumot validatsiyasi — grafiklar va statistika.

Ishlatish (services/ml ichidan):
    python -m simulation.validate
Natija: reports/synthetic_validation.png + konsolda statistika.
"""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from . import db

REPORTS_DIR = Path(__file__).resolve().parents[1] / "reports"


def _df(conn, sql: str) -> pd.DataFrame:
    with conn.cursor() as cur:
        cur.execute(sql)
        cols = [c.name for c in cur.description]
        return pd.DataFrame(cur.fetchall(), columns=cols)


def main() -> None:
    conn = db.connect()
    try:
        hourly = _df(conn, """
            SELECT bucket, branch_id, sum(arrivals) AS arrivals
            FROM hourly_arrivals GROUP BY bucket, branch_id ORDER BY bucket
        """)
        stats = _df(conn, """
            SELECT
              count(*) FILTER (WHERE event_type='issued')    AS tickets,
              count(*) FILTER (WHERE event_type='completed') AS completed,
              count(*) FILTER (WHERE event_type='abandoned') AS abandoned,
              count(*) FILTER (WHERE event_type='no_show')   AS no_show,
              round(avg(wait_time_sec) FILTER (WHERE event_type='called') / 60.0, 1) AS avg_wait_min,
              round(((percentile_cont(0.95) WITHIN GROUP (ORDER BY wait_time_sec)
                     FILTER (WHERE event_type='called')) / 60.0)::numeric, 1) AS p95_wait_min
            FROM queue_events WHERE source='synthetic'
        """)
    finally:
        conn.close()

    if hourly.empty:
        raise SystemExit("hourly_arrivals bo'sh — avval generator ishga tushirilsin.")

    hourly["bucket"] = pd.to_datetime(hourly["bucket"], utc=True).dt.tz_convert("Asia/Tashkent")
    hourly["arrivals"] = hourly["arrivals"].astype(float)
    hourly["hour"] = hourly["bucket"].dt.hour
    hourly["weekday"] = hourly["bucket"].dt.weekday
    hourly["dom"] = hourly["bucket"].dt.day

    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    fig.suptitle("Sintetik ma'lumot validatsiyasi", fontsize=14)

    for b, grp in hourly.groupby("branch_id"):
        grp.groupby("hour")["arrivals"].mean().plot(
            ax=axes[0, 0], marker="o", label=f"Filial {b}")
    axes[0, 0].set_title("O'rtacha kelishlar — soat bo'yicha (tushlik cho'qqisi)")
    axes[0, 0].set_xlabel("Soat")
    axes[0, 0].legend()

    weekday_names = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]
    wk = hourly.groupby(["weekday", "branch_id"])["arrivals"].sum().unstack()
    daily_wk = hourly.groupby([hourly["bucket"].dt.date, "weekday", "branch_id"])["arrivals"] \
        .sum().groupby(["weekday", "branch_id"]).mean().unstack()
    daily_wk.plot(kind="bar", ax=axes[0, 1])
    axes[0, 1].set_title("O'rtacha kunlik hajm — hafta kuni bo'yicha")
    axes[0, 1].set_xticklabels([weekday_names[i] for i in daily_wk.index], rotation=0)

    daily_dom = hourly.groupby([hourly["bucket"].dt.date, "dom"])["arrivals"] \
        .sum().groupby("dom").mean()
    daily_dom.plot(ax=axes[1, 0], marker="o", color="tab:red")
    axes[1, 0].set_title("O'rtacha kunlik hajm — oy kuni bo'yicha (maosh cho'qqisi)")
    axes[1, 0].set_xlabel("Oy kuni")

    last14 = hourly[hourly["bucket"] >= hourly["bucket"].max() - pd.Timedelta(days=14)]
    for b, grp in last14.groupby("branch_id"):
        axes[1, 1].plot(grp["bucket"], grp["arrivals"], label=f"Filial {b}", lw=0.8)
    axes[1, 1].set_title("Oxirgi 14 kun — soatlik oqim")
    axes[1, 1].legend()

    plt.tight_layout()
    REPORTS_DIR.mkdir(exist_ok=True)
    out = REPORTS_DIR / "synthetic_validation.png"
    fig.savefig(out, dpi=110)

    s = stats.iloc[0]
    abandon_pct = 100.0 * int(s.abandoned) / int(s.tickets)
    print(f"Talonlar:        {int(s.tickets):,}")
    print(f"Yakunlangan:     {int(s.completed):,}")
    print(f"Ketib qolgan:    {int(s.abandoned):,} ({abandon_pct:.1f}%)")
    print(f"Kelmagan:        {int(s.no_show):,}")
    print(f"O'rtacha kutish: {s.avg_wait_min} daq | 95-persentil: {s.p95_wait_min} daq")
    print(f"\nGrafik: {out}")


if __name__ == "__main__":
    main()
