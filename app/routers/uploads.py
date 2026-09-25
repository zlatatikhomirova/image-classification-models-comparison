# app/routers/uploads.py
"""
Управление временными загрузками в uploads/.
"""

import os

from fastapi import APIRouter, HTTPException

from app.config import UPLOAD_DIR

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/cleanup")
async def cleanup_uploads():
    """Удаляет все файлы из uploads/ (кроме .gitkeep)."""
    if not os.path.isdir(UPLOAD_DIR):
        return {"deleted": 0}

    count = 0
    for fname in os.listdir(UPLOAD_DIR):
        if fname.startswith("."):
            continue
        path = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(path):
            try:
                os.remove(path)
                count += 1
            except Exception:
                pass
    return {"deleted": count}


@router.post("/delete")
async def delete_upload(payload: dict):
    """Удаляет один файл из uploads/ по upload_id."""
    upload_id = payload.get("upload_id")
    if not upload_id:
        raise HTTPException(status_code=400, detail="upload_id не указан")

    safe = os.path.basename(upload_id)
    path = os.path.join(UPLOAD_DIR, safe)
    if os.path.isfile(path):
        os.remove(path)
        return {"deleted": safe}
    return {"deleted": None}