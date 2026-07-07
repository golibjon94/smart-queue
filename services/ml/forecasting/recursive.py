"""Rekursiv multi-step bashorat: har qadam bashorati keyingi qadam uchun lag bo'ladi."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .features import FEATURES, is_open


def recursive_forecast(booster, history: pd.DataFrame, horizon_hours: int) -> pd.DataFrame:
    """history: make_features chiqishi (aktual ma'lumot bilan tugaydi).

    Qaytaradi: bucket, branch_id, service_type_id, pred ustunli DataFrame.
    """
    # Pivot: index=bucket, columns=(branch, service)
    series = history.pivot_table(index="bucket", values="arrivals",
                                 columns=["branch_id", "service_type_id"])
    series = series.sort_index()
    cols = list(series.columns)

    last = series.index.max()
    future = pd.date_range(last + pd.Timedelta(hours=1), periods=horizon_hours,
                           freq="h", tz=str(series.index.tz))

    out_rows: list[tuple] = []
    for t in future:
        preds = np.zeros(len(cols))
        if is_open(t):
            X = pd.DataFrame({
                "branch_id": [c[0] for c in cols],
                "service_type_id": [c[1] for c in cols],
                "hour": t.hour, "weekday": t.weekday(), "dom": t.day,
                "is_payday_early": int(t.day <= 3),
                "is_month_end": int(t.day >= 28),
            })
            w24 = series.loc[t - pd.Timedelta(hours=24): t - pd.Timedelta(hours=1)]
            w168 = series.loc[t - pd.Timedelta(hours=168): t - pd.Timedelta(hours=1)]
            X["lag_1"] = series.iloc[-1].values
            X["lag_24"] = series.loc[t - pd.Timedelta(hours=24)].values \
                if (t - pd.Timedelta(hours=24)) in series.index else np.nan
            X["lag_168"] = series.loc[t - pd.Timedelta(hours=168)].values \
                if (t - pd.Timedelta(hours=168)) in series.index else np.nan
            X["roll_mean_24"] = w24.mean().values
            X["roll_std_24"] = w24.std().values
            X["roll_mean_168"] = w168.mean().values
            weekly = [series.loc[t - pd.Timedelta(hours=168 * k)].values
                      for k in (1, 2, 3, 4)
                      if (t - pd.Timedelta(hours=168 * k)) in series.index]
            X["swh_mean_4w"] = np.mean(weekly, axis=0) if weekly else np.nan
            preds = np.clip(booster.predict(X[FEATURES]), 0.0, None)

        series.loc[t] = preds
        out_rows.extend(
            (t, c[0], c[1], float(p)) for c, p in zip(cols, preds)
        )

    return pd.DataFrame(out_rows, columns=["bucket", "branch_id", "service_type_id", "pred"])
