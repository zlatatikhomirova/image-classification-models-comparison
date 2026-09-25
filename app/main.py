# app/main.py
"""
Точка входа FastAPI-приложения.
Создаёт приложение, монтирует статику, подключает роутеры.
"""

import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import TEST_DIR, UPLOAD_DIR
from app.routers import analyze, checkpoints, classes, pages, test_images
from app.routers import uploads

app = FastAPI(
    title="Image Classification Models Comparison",
    description=(
        "Сравнение 8 предобученных нейронных сетей "
        "(VGG16, ResNet50, InceptionV3, DenseNet121, Xception, "
        "MobileNetV2, EfficientNetB0, EfficientNetV2B0) "
        "на задаче классификации изображений."
    ),
    version="1.0.0",
)

# ---------- Статика ----------
# /static/* — CSS, JS, Tom Select
app.mount("/static", StaticFiles(directory="static"), name="static")

# /test_images/* — картинки тестового набора
os.makedirs(TEST_DIR, exist_ok=True)
app.mount("/test_images", StaticFiles(directory=TEST_DIR), name="test_images")

# ---------- Роутеры ----------
app.include_router(pages.router)         # GET /
app.include_router(analyze.router)       # POST /api/analyze
app.include_router(checkpoints.router)   # /api/checkpoints/*
app.include_router(test_images.router)   # GET /api/test_images
app.include_router(classes.router)       # GET /api/classes
app.include_router(uploads.router)



@app.get("/api/health")
async def health():
    """Простая проверка работоспособности."""
    from app.models import available_models
    return {"status": "ok", "models": available_models()}