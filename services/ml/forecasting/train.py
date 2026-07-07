"""LightGBM global modellarini o'qitish + backtest.

Ikki model:
  - FILIAL modeli — filial-soat jami oqim (asosiy MAPE metrikasi, katta lambda)
  - XIZMAT modeli — filial+xizmat kesimi (marshrutlash/Erlang-C uchun)

Ishlatish (services/ml ichidan):
    python -m forecasting.train --holdout-days 14

Backtest: rolling-origin, kunlik gorizont — "bugungi aktuallar bilan ertangi
kunni bashorat qil" (mahsulot rejimiga mos). Holdout aktuallari o'qitishda
ishlatilmaydi.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from simulation import db

from .baseline import seasonal_ma_forecast
from .features import CATEGORICAL, FEATURES, TARGET, load_hourly, make_features
from .metrics import mape, poisson_mape_floor, wape
from .recursive import recursive_forecast

ML_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ML_ROOT / "models"
REPORTS_DIR = ML_ROOT / "reports"

LGB_PARAMS = {
    "objective": "poisson",
    "learning_rate": 0.03,
    "num_leaves": 127,
    "min_data_in_leaf": 20,
    "feature_fraction": 0.9,
    "bagging_fraction": 0.9,
    "bagging_freq": 1,
    "metric": "mae",
    "verbosity": -1,
    "seed": 42,
}


def _fit(train_df: pd.DataFrame, valid_df: pd.DataFrame | None,
         num_boost_round: int) -> lgb.Booster:
    dtrain = lgb.Dataset(train_df[FEATURES], label=train_df[TARGET],
                         categorical_feature=CATEGORICAL, free_raw_data=True)
    kwargs: dict = {}
    if valid_df is not None:
        dvalid = lgb.Dataset(valid_df[FEATURES], label=valid_df[TARGET],
                             reference=dtrain, categorical_feature=CATEGORICAL)
        kwargs = {"valid_sets": [dvalid],
                  "callbacks": [lgb.early_stopping(100, verbose=False)]}
    return lgb.train(LGB_PARAMS, dtrain, num_boost_round=num_boost_round, **kwargs)


def _rolling_backtest(booster, feats: pd.DataFrame, cutoff: pd.Timestamp):
    """Har holdout kuni uchun kunlik rekursiv bashorat (aktuallar origin'gacha)."""
    origins = pd.date_range(cutoff.normalize(),
                            feats["bucket"].max().normalize() - pd.Timedelta(days=1),
                            freq="D")
    lgbm_parts, base_parts = [], []
    for origin in origins:
        history = feats[feats["bucket"] < origin + pd.Timedelta(days=1)]
        lgbm_parts.append(recursive_forecast(booster, history, 24))
        base_parts.append(seasonal_ma_forecast(history, 24))
    return (pd.concat(lgbm_parts, ignore_index=True),
            pd.concat(base_parts, ignore_index=True))


def _train_and_eval(raw: pd.DataFrame, holdout_days: int, label: str):
    feats = make_features(raw)
    open_rows = feats[feats["is_open"]].dropna(subset=["lag_168", "swh_mean_4w"])

    cutoff = feats["bucket"].max() - pd.Timedelta(days=holdout_days)
    valid_cutoff = cutoff - pd.Timedelta(days=14)
    train_df = open_rows[open_rows["bucket"] <= valid_cutoff]
    valid_df = open_rows[(open_rows["bucket"] > valid_cutoff) & (open_rows["bucket"] <= cutoff)]

    booster = _fit(train_df, valid_df, num_boost_round=2000)
    best_iter = booster.best_iteration or 2000

    lgbm_pred, base_pred = _rolling_backtest(booster, feats, cutoff)
    actual = open_rows[open_rows["bucket"] > cutoff][
        ["bucket", "branch_id", "service_type_id", "arrivals"]]
    keys = ["bucket", "branch_id", "service_type_id"]
    m_lgbm = actual.merge(lgbm_pred, on=keys)
    m_base = actual.merge(base_pred, on=keys)

    metrics = {
        "lightgbm_mape": round(mape(m_lgbm["arrivals"], m_lgbm["pred"]), 2),
        "baseline_mape": round(mape(m_base["arrivals"], m_base["pred"]), 2),
        "lightgbm_wape": round(wape(m_lgbm["arrivals"], m_lgbm["pred"]), 2),
        "baseline_wape": round(wape(m_base["arrivals"], m_base["pred"]), 2),
        "poisson_floor_mape": round(poisson_mape_floor(m_lgbm["arrivals"]), 2),
        "best_iteration": best_iter,
    }
    print(f"=== {label} ===")
    print(f"  LightGBM MAPE: {metrics['lightgbm_mape']}% | "
          f"Baseline MAPE: {metrics['baseline_mape']}% | "
          f"WAPE: {metrics['lightgbm_wape']}% | "
          f"Poisson floor: ~{metrics['poisson_floor_mape']}%")

    # Yakuniy model: to'liq ma'lumotda qayta o'qitish
    final = _fit(open_rows, None, num_boost_round=best_iter)
    return final, metrics, m_lgbm, m_base, cutoff


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--holdout-days", type=int, default=14)
    args = parser.parse_args()

    conn = db.connect()
    try:
        raw = load_hourly(conn)
    finally:
        conn.close()
    print(f"Ma'lumot: {raw['bucket'].min():%Y-%m-%d} .. {raw['bucket'].max():%Y-%m-%d}, "
          f"holdout={args.holdout_days} kun\n")

    # --- FILIAL modeli (asosiy metrika) ---
    raw_branch = raw.groupby(["bucket", "branch_id"], as_index=False)["arrivals"].sum()
    raw_branch["service_type_id"] = 0  # yagona psevdo-xizmat
    booster_b, metrics_b, mb_lgbm, mb_base, cutoff = _train_and_eval(
        raw_branch, args.holdout_days, "Filial-soat darajasi (asosiy metrika)")
    ok = "HA ✅" if metrics_b["lightgbm_mape"] <= 15.0 else "YO'Q ❌"
    print(f"  Maqsad MAPE <= 15%: {ok}\n")

    # --- XIZMAT modeli (marshrutlash uchun) ---
    booster_s, metrics_s, _, _, _ = _train_and_eval(
        raw, args.holdout_days, "Xizmat-soat darajasi (marshrutlash uchun)")

    # Ishonch oralig'i uchun filial qoldiq std
    resid = mb_lgbm.assign(e=lambda d: d["arrivals"] - d["pred"])
    resid_std = resid.groupby("branch_id")["e"].std().to_dict()

    # --- Grafik: filial darajasi, aktual vs bashorat vs baseline ---
    fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=True)
    for ax, b in zip(axes, sorted(mb_lgbm["branch_id"].unique())):
        a = mb_lgbm[mb_lgbm["branch_id"] == b].set_index("bucket")
        bb = mb_base[mb_base["branch_id"] == b].set_index("bucket")
        ax.plot(a.index, a["arrivals"], label="Aktual", lw=1.2, color="black")
        ax.plot(a.index, a["pred"], label="LightGBM", lw=1.2, color="tab:blue")
        ax.plot(bb.index, bb["pred"], label="Baseline (mavsumiy MA)",
                lw=1.0, ls="--", color="tab:orange")
        ax.set_title(f"Filial {b} — holdout {args.holdout_days} kun (rolling day-ahead)")
        ax.legend()
    plt.tight_layout()
    REPORTS_DIR.mkdir(exist_ok=True)
    fig.savefig(REPORTS_DIR / "backtest.png", dpi=110)

    report = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "cutoff": str(cutoff),
        "holdout_days": args.holdout_days,
        "branch_hour": metrics_b,
        "service_hour": metrics_s,
    }
    (REPORTS_DIR / "backtest_report.json").write_text(json.dumps(report, indent=2))

    version = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    MODELS_DIR.mkdir(exist_ok=True)
    payload = {
        "booster_branch": booster_b,
        "booster_service": booster_s,
        "features": FEATURES,
        "categorical": CATEGORICAL,
        "residual_std_by_branch": resid_std,
        "model_name": "lightgbm_global",
        "version": version,
        "report": report,
    }
    joblib.dump(payload, MODELS_DIR / f"lgbm_{version}.joblib")
    joblib.dump(payload, MODELS_DIR / "latest.joblib")
    print(f"\nModel saqlandi: models/lgbm_{version}.joblib (+ latest.joblib)")
    print("Hisobot: reports/backtest_report.json, reports/backtest.png")


if __name__ == "__main__":
    main()
