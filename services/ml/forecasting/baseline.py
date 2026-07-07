"""Baseline: mavsumiy o'rtacha — o'tgan 4 haftaning bir xil (hafta kuni, soat)i."""
from __future__ import annotations

import numpy as np
import pandas as pd


def seasonal_ma_forecast(history: pd.DataFrame, horizon_hours: int, weeks: int = 4) -> pd.DataFrame:
    """history: make_features chiqishi. Faqat cutoff'gacha bo'lgan aktuallardan foydalanadi."""
    series = history.pivot_table(index="bucket", values="arrivals",
                                 columns=["branch_id", "service_type_id"]).sort_index()
    cols = list(series.columns)
    last = series.index.max()
    future = pd.date_range(last + pd.Timedelta(hours=1), periods=horizon_hours,
                           freq="h", tz=str(series.index.tz))

    rows: list[tuple] = []
    for t in future:
        vals = []
        for k in range(1, weeks + 1):
            src = t - pd.Timedelta(hours=168 * k)
            if src in series.index:
                vals.append(series.loc[src].values)
        pred = np.mean(vals, axis=0) if vals else np.zeros(len(cols))
        rows.extend((t, c[0], c[1], float(p)) for c, p in zip(cols, pred))

    return pd.DataFrame(rows, columns=["bucket", "branch_id", "service_type_id", "pred"])
