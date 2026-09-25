# app/routers/classes.py
"""
Роутер для получения списка классов ImageNet.
"""

from fastapi import APIRouter

from app.schemas import ClassesResponse
from app.services.classes_service import get_all_classes, get_used_classes

router = APIRouter(prefix="/api", tags=["classes"])


@router.get("/classes", response_model=ClassesResponse)
async def list_classes():
    """
    Возвращает:
      - all: все 998 уникальных классов ImageNet
      - used: классы, встречающиеся в test_images/labels.csv
    """
    return ClassesResponse(
        all=get_all_classes(),
        used=get_used_classes(),
    )

@router.get("/models")
async def get_models():
    """Список доступных моделей."""
    from app.models import available_models
    return {"models": available_models()}