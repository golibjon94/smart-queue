"""smart-queue ML servisi — FastAPI kirish nuqtasi.

Ishga tushirish (services/ml ichidan):
    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI

from .api.routes import router

app = FastAPI(
    title="smart-queue ML",
    description="Bashorat (LightGBM) va tavsiya (Erlang-C) servisi",
    version="0.1.0",
)
app.include_router(router)
