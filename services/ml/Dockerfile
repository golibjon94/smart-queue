FROM python:3.11-slim

WORKDIR /app

# LightGBM uchun OpenMP runtime kerak
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY forecasting ./forecasting
COPY recommend ./recommend
COPY simulation ./simulation
COPY sentiment ./sentiment

RUN pip install --no-cache-dir .

# models/ compose orqali volume sifatida ulanadi
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
