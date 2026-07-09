"""Feature engineering: hourly_arrivals -> LightGBM uchun xususiyatlar.

Panjara (grid) barcha soatlarni o'z ichiga oladi (yopiq soatlar arrivals=0) —
lag-24/168 to'g'ri hisoblanishi uchun. O'qitish/baholashda faqat ish soatlari
(is_open=True) qatorlari ishlatiladi.
"""
from __future__ import annotations

import pandas as pd

# Ish soatlari mantig'i generator konfiguratsiyasi bilan bitta manbadan
from simulation.intensity import business_hours

TZ = "Asia/Tashkent"

# lag_1 ataylab YO'Q: kunlik rekursiv bashoratda u o'z bashoratiga tayanib
# xatoni kompaundlaydi; lag_24/168 esa day-ahead rejimda doim aktualga tayanadi.
FEATURES = [
    "branch_id", "service_type_id", "hour", "weekday", "dom",
    "is_payday_early", "is_month_end",
    "lag_24", "lag_168",
    "roll_mean_24", "roll_mean_168", "swh_mean_4w",
]
CATEGORICAL = ["branch_id", "service_type_id", "hour", "weekday"]
TARGET = "arrivals"


def load_hourly(conn) -> pd.DataFrame:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT bucket, branch_id, service_type_id,
                   COALESCE(arrivals, 0) AS arrivals
            FROM hourly_arrivals ORDER BY bucket
        """)
        df = pd.DataFrame(cur.fetchall(),
                          columns=["bucket", "branch_id", "service_type_id", "arrivals"])
    df["bucket"] = pd.to_datetime(df["bucket"], utc=True).dt.tz_convert(TZ)
    df["arrivals"] = df["arrivals"].astype(float)
    return df


def is_open(ts: pd.Timestamp) -> bool:
    return ts.hour in business_hours(ts.date())


def build_grid(df: pd.DataFrame) -> pd.DataFrame:
    """To'liq soatlik panjara: har (filial, xizmat) x har soat, bo'shlar 0."""
    start = df["bucket"].min().normalize()
    end = df["bucket"].max().normalize() + pd.Timedelta(hours=23)
    idx = pd.date_range(start, end, freq="h", tz=TZ)

    combos = df[["branch_id", "service_type_id"]].drop_duplicates()
    grid = combos.merge(pd.DataFrame({"bucket": idx}), how="cross")
    grid = grid.merge(df, on=["bucket", "branch_id", "service_type_id"], how="left")
    grid["arrivals"] = grid["arrivals"].fillna(0.0)
    return grid.sort_values(["branch_id", "service_type_id", "bucket"]).reset_index(drop=True)


def add_calendar(grid: pd.DataFrame) -> pd.DataFrame:
    b = grid["bucket"]
    grid["hour"] = b.dt.hour
    grid["weekday"] = b.dt.weekday
    grid["dom"] = b.dt.day
    grid["is_payday_early"] = (grid["dom"] <= 3).astype(int)
    grid["is_month_end"] = (grid["dom"] >= 28).astype(int)
    grid["is_open"] = b.map(is_open)
    return grid


def add_lags(grid: pd.DataFrame) -> pd.DataFrame:
    keys = ["branch_id", "service_type_id"]
    g = grid.groupby(keys)["arrivals"]
    grid["lag_24"] = g.shift(24)
    grid["lag_168"] = g.shift(168)

    shifted = g.shift(1)
    grp = shifted.groupby([grid[k] for k in keys])
    grid["roll_mean_24"] = grp.transform(lambda s: s.rolling(24, min_periods=24).mean())
    grid["roll_mean_168"] = grp.transform(lambda s: s.rolling(168, min_periods=168).mean())

    # O'tgan 4 haftadagi bir xil (hafta kuni, soat) o'rtachasi — kunlik
    # shovqinni tekislaydigan eng kuchli denoiser
    swh = grid.groupby(keys + ["weekday", "hour"])["arrivals"]
    grid["swh_mean_4w"] = swh.transform(lambda s: s.shift(1).rolling(4, min_periods=2).mean())
    return grid


def make_features(df: pd.DataFrame) -> pd.DataFrame:
    return add_lags(add_calendar(build_grid(df)))
