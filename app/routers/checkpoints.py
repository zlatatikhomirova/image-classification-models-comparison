# app/routers/checkpoints.py
"""
Роутер для CRUD операций с чекпоинтами.
Принимает multipart/form-data: JSON-payload + файлы.
"""

import json
import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from typing import List

from app.schemas import (
    CheckpointInfo,
    CheckpointListResponse,
    SaveCheckpointResponse,
)
from app.services import checkpoint_service

router = APIRouter(prefix="/api/checkpoints", tags=["checkpoints"])


@router.get("", response_model=CheckpointListResponse)
async def list_checkpoints():
    """Список сохранённых чекпоинтов."""
    items = checkpoint_service.list_checkpoints()
    return CheckpointListResponse(
        checkpoints=[CheckpointInfo(**c) for c in items],
    )


@router.post("", response_model=SaveCheckpointResponse)
async def save_checkpoint(
    payload: str = Form(..., description="JSON-строка с данными чекпоинта"),
    images: List[UploadFile] = File(
        default=[],
        description="Файлы изображений (те, что были загружены)",
    ),
):
    """
    Сохраняет чекпоинт: JSON + фото.
    payload — JSON-строка с полями: name, threshold, images, metrics, labels.
    images — файлы, соответствующие img.filename в payload.
    """
    # 1. Парсим payload
    try:
        data = json.loads(payload)
        if not isinstance(data, dict):
            raise ValueError("payload должен быть объектом")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Некорректный JSON в payload: {e}",
        )

    # 2. Собираем файлы в [(name, bytes), ...]
    files: list[tuple[str, bytes]] = []
    for upload in images:
        content = await upload.read()
        files.append((upload.filename, content))

    # 3. Сохраняем
    try:
        result = checkpoint_service.save_checkpoint(data, files)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {e}")

    return SaveCheckpointResponse(**result)


@router.get("/{filename}")
async def get_checkpoint(filename: str):
    """Возвращает JSON чекпоинта."""
    data = checkpoint_service.load_checkpoint(filename)
    if data is None:
        raise HTTPException(status_code=404, detail="Чекпоинт не найден")
    return data


@router.get("/{filename}/images/{image_name}")
async def get_checkpoint_image(filename: str, image_name: str):
    """Отдаёт фото из папки чекпоинта."""
    path = checkpoint_service.get_checkpoint_image_path(filename, image_name)
    if path is None:
        raise HTTPException(status_code=404, detail="Фото не найдено")
    return FileResponse(path)


@router.delete("/{filename}")
async def delete_checkpoint(filename: str):
    """Удаляет чекпоинт (JSON + папку с фото)."""
    ok = checkpoint_service.delete_checkpoint(filename)
    if not ok:
        raise HTTPException(status_code=404, detail="Чекпоинт не найден")
    return {"deleted": filename}