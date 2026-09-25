# app/routers/test_images.py
"""
Роутер для получения списка файлов из test_images/.
"""

import os

from fastapi import APIRouter

from app.config import ALLOWED_EXTENSIONS, TEST_DIR
from app.schemas import TestImagesResponse

router = APIRouter(prefix="/api", tags=["test-images"])


@router.get("/test_images", response_model=TestImagesResponse)
async def list_test_images():
    """Возвращает отсортированный список файлов из test_images/."""
    if not os.path.isdir(TEST_DIR):
        return TestImagesResponse(images=[])

    files = sorted(
        f for f in os.listdir(TEST_DIR)
        if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS
    )
    return TestImagesResponse(images=files)

