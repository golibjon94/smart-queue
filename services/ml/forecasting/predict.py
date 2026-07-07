"""Kelasi N soat bashorati -> forecasts jadvali.

Ishlatish (services/ml ichidan):
    python -m forecasting.predict --hours 72 --replace

Ikki turdagi qator yoziladi:
  - service_type_id IS NULL  -> filial jami (filial modeli)
  - service_type_id = <id>   -> xizmat kesimi (xizmat modeli)
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np

from simulation import db

from .features import load_hourly, make_features
from .recursive import recursive_forecast

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
Z80 = 1.28  # 80% ishonch oralig'i


def load_model(path: Path | None = None) -> dict:
    return joblib.load(path or MODELS_DIR / "latest.joblib")


def build_forecasts(payload: dict, raw, hours: int):
    """(branch_rows, service_rows) — forecasts jadvali uchun tayyor tuple'lar."""
    resid_std = payload["residual_std_by_branch"]
    name, version = payload["model_name"], payload["version"]

    # Filial darajasi
    raw_b = raw.groupby(["bucket", "branch_id"], as_index=False)["arrivals"].sum()
    raw_b["service_type_id"] = 0
    feats_b = make_features(raw_b)
    pred_b = recursive_forecast(payload["booster_branch"], feats_b, hours)

    branch_rows = []
    for r in pred_b.itertuples():
        if r.pred <= 0:
            continue  # yopiq soatlar
        std = float(resid_std.get(r.branch_id, np.sqrt(max(r.pred, 1.0))))
        branch_rows.append((
            int(r.branch_id), None, r.bucket.to_pydatetime(),
            round(r.pred, 2),
            round(max(r.pred - Z80 * std, 0.0), 2),
            round(r.pred + Z80 * std, 2),
            name, version,
        ))

    # Xizmat darajasi
    feats_s = make_features(raw)
    pred_s = recursive_forecast(payload["booster_service"], feats_s, hours)

    service_rows = []
    for r in pred_s.itertuples():
        if r.pred <= 0:
            continue
        std = float(np.sqrt(max(r.pred, 0.5)))  # Poisson taxmini
        service_rows.append((
            int(r.branch_id), int(r.service_type_id), r.bucket.to_pydatetime(),
            round(r.pred, 2),
            round(max(r.pred - Z80 * std, 0.0), 2),
            round(r.pred + Z80 * std, 2),
            name, version,
        ))
    return branch_rows, service_rows


def write_forecasts(conn, rows: list[tuple], replace: bool, model_name: str) -> None:
    with conn.cursor() as cur:
        if replace:
            cur.execute("DELETE FROM forecasts WHERE model_name = %s", (model_name,))
        cur.executemany(
            """INSERT INTO forecasts
               (branch_id, service_type_id, target_time, predicted_arrivals,
                lower_ci, upper_ci, model_name, model_version)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            rows,
        )
    conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hours", type=int, default=72)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()

    payload = load_model()
    conn = db.connect()
    try:
        raw = load_hourly(conn)
        branch_rows, service_rows = build_forecasts(payload, raw, args.hours)
        write_forecasts(conn, branch_rows + service_rows,
                        args.replace, payload["model_name"])
    finally:
        conn.close()
    print(f"forecasts jadvaliga yozildi: {len(branch_rows)} filial-qator, "
          f"{len(service_rows)} xizmat-qator (gorizont {args.hours}h, "
          f"model {payload['model_name']} v{payload['version']})")


if __name__ == "__main__":
    main()
