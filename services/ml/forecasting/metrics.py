"""Baholash metrikalari."""
from __future__ import annotations

import numpy as np
import pandas as pd


def mape(actual: np.ndarray, pred: np.ndarray) -> float:
    """O'rtacha absolyut foiz xato — faqat actual > 0 qatorlarda."""
    a, p = np.asarray(actual, float), np.asarray(pred, float)
    mask = a > 0
    return float(np.mean(np.abs(a[mask] - p[mask]) / a[mask]) * 100.0)


def wape(actual: np.ndarray, pred: np.ndarray) -> float:
    """Og'irlikli absolyut foiz xato: sum|xato| / sum(actual)."""
    a, p = np.asarray(actual, float), np.asarray(pred, float)
    return float(np.sum(np.abs(a - p)) / np.sum(a) * 100.0)


def poisson_mape_floor(actual: np.ndarray) -> float:
    """Nazariy quyi chegara: mukammal model ham Poisson shovqinidan qutulolmaydi.

    E|X - lam| / lam, X~Poisson(lam) uchun taxminan sqrt(2/(pi*lam)).
    """
    a = np.asarray(actual, float)
    a = a[a > 0]
    return float(np.mean(np.sqrt(2.0 / (np.pi * a))) * 100.0)


def branch_level(df: pd.DataFrame, value_col: str) -> pd.DataFrame:
    """Xizmat turlari bo'yicha yig'ib, filial-soat darajasiga o'tkazish."""
    return (df.groupby(["bucket", "branch_id"])[value_col]
              .sum().reset_index())
