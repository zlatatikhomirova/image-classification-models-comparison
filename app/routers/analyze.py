# app/routers/analyze.py
"""
Роутер анализа: принимает изображения, прогоняет через 8 моделей,
возвращает сырые предсказания. Метрики считаются на фронте.
"""

import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import ALLOWED_EXTENSIONS, MAX_IMAGES, TOP_K, UPLOAD_DIR
from app.schemas import AnalyzeResponse, ImageResult, ModelResult, PredictionItem
from app.services.inference_service import run_inference

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    images: List[UploadFile] = File(..., description="Изображения для анализа"),
):
    """
    Прогоняет изображения через 8 моделей.
    Возвращает предсказания + upload_id (UUID-имя файла в uploads/),
    чтобы фронт мог удалять файлы с сервера.
    """
    if not images:
        raise HTTPException(status_code=400, detail="Файлы не загружены")

    if len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Максимум {MAX_IMAGES} изображений за раз",
        )

    # Сохраняем файлы на диск
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    saved_paths: list[str] = []
    saved_uuids: list[str] = []
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
        saved_uuids.append(fname)
        original_names.append(upload.filename)

    # Инференс
    raw = run_inference(saved_paths, top_k=TOP_K)

    # Подменяем uuid-имена на оригинальные + добавляем upload_id
    for item, original, uid in zip(raw, original_names, saved_uuids):
        item["filename"] = original
        item["upload_id"] = uid

    # Формируем ответ
    response_images = [
        ImageResult(
            filename=item["filename"],
            upload_id=item.get("upload_id", ""),
            results=[
                ModelResult(
                    model=r["model"],
                    top=[PredictionItem(**t) for t in r["top"]],
                    time_ms=r["time_ms"],
                )
                for r in item["results"]
            ],
        )
        for item in raw
    ]

    return AnalyzeResponse(
        images=response_images,
        n_total=len(original_names),
    )