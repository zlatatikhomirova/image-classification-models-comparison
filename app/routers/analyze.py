# app/routers/analyze.py
"""
Главный роутер анализа.
Принимает изображения + опциональные метки,
прогоняет через 8 моделей, считает метрики (если есть метки).
"""

import json
import os
import shutil
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.config import (
    ALLOWED_EXTENSIONS, CONFIDENCE_THRESHOLD, MAX_IMAGES,
    TOP_K, UPLOAD_DIR,
)
from app.schemas import AnalyzeResponse, ImageResult, ModelResult, MetricRow, PredictionItem
from app.services.evaluation_service import compute_metrics
from app.services.inference_service import run_inference

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    images: List[UploadFile] = File(..., description="Изображения для анализа"),
    labels: Optional[str] = Form(
        None,
        description='JSON-строка вида {"cat_01.jpg": "tabby", ...}',
    ),
    threshold: float = Query(
        CONFIDENCE_THRESHOLD,
        ge=0.0, le=1.0,
        description="Порог уверенности",
    ),
):
    """
    Прогоняет изображения через 8 моделей.
    Если передан labels — дополнительно считает метрики.
    """
    if not images:
        raise HTTPException(status_code=400, detail="Файлы не загружены")

    if len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Максимум {MAX_IMAGES} изображений за раз",
        )

    # Парсим метки
    true_labels: dict[str, str] = {}
    if labels:
        try:
            true_labels = json.loads(labels)
            if not isinstance(true_labels, dict):
                raise ValueError("labels должен быть объектом")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный JSON в labels: {e}",
            )

    # Сохраняем файлы на диск
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    saved_paths: list[str] = []
    original_names: list[str] = []

    for upload in images:
        ext = os.path.splitext(upload.filename)[1].lower() or ".jpg"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Неподдерживаемый формат: {ext}",
            )

        fname = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, fname)

        with open(path, "wb") as f:
            shutil.copyfileobj(upload.file, f)

        saved_paths.append(path)
        original_names.append(upload.filename)

    # Инференс
    raw = run_inference(saved_paths, threshold=threshold, top_k=TOP_K)

    # Подменяем имя файла на оригинальное (uuid → cat_01.jpg)
    for item, original in zip(raw, original_names):
        item["filename"] = original

    # Считаем метрики (только для изображений с метками)
    n_with_labels = sum(1 for name in original_names if name in true_labels)
    metrics: Optional[list[dict]] = None
    if n_with_labels > 0:
        metrics = compute_metrics(raw, true_labels, threshold=threshold)

    # Формируем ответ через Pydantic
    response_images = [
        ImageResult(
            filename=item["filename"],
            results=[
                ModelResult(
                    model=r["model"],
                    top=[PredictionItem(**t) for t in r["top"]],
                    top1_confident=r["top1_confident"],
                    time_ms=r["time_ms"],
                )
                for r in item["results"]
            ],
        )
        for item in raw
    ]

    response_metrics = (
        [MetricRow(**m) for m in metrics] if metrics else None
    )

    return AnalyzeResponse(
        images=response_images,
        metrics=response_metrics,
        n_total=len(original_names),
        n_with_labels=n_with_labels,
        threshold=threshold,
    )