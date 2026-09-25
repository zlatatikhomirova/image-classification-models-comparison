# app/services/checkpoint_service.py
"""
Сервис чекпоинтов.
Чекпоинт = JSON-файл + папка с фото рядом.

Структура:
  results/checkpoints/
  ├── my_test_20260924_013000.json
  ├── my_test_20260924_013000/       ← папка с фото
  │   ├── <md5_1>.jpg
  │   └── <md5_2>.jpg
  └── ...
"""

import hashlib
import json
import os
import re
import shutil
from datetime import datetime

from app.config import CHECKPOINT_DIR, CHECKPOINT_MAX_FILES


def _safe_name(name: str) -> str:
    """Оставляет только буквы, цифры, дефис и подчёркивание."""
    safe = re.sub(r"[^\w\-]", "_", name, flags=re.UNICODE)
    return safe.strip("_") or "checkpoint"


def _checkpoint_dir_for(filename: str) -> str:
    """Возвращает путь к папке с фото чекпоинта (без .json)."""
    base = filename[:-5] if filename.endswith(".json") else filename
    return os.path.join(CHECKPOINT_DIR, base)


# ---------- Сохранение ----------

def save_checkpoint(payload: dict, files: list[tuple[str, bytes]]) -> dict:
    """
    Сохраняет чекпоинт: JSON + фото.

    payload: JSON-данные (name, threshold, images, metrics, labels)
    files: список кортежей (original_filename, content_bytes)

    Возвращает: {"filename": "...json", "saved_at": "...", "n_images": N}
    """
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    # 1. Имя чекпоинта
    name = payload.get("name") or "checkpoint"
    safe = _safe_name(name)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    checkpoint_name = f"{safe}_{ts}"
    filename = f"{checkpoint_name}.json"
    json_path = os.path.join(CHECKPOINT_DIR, filename)

    # 2. Папка для фото
    images_dir = os.path.join(CHECKPOINT_DIR, checkpoint_name)
    os.makedirs(images_dir, exist_ok=True)

    # 3. Сохраняем фото по хешу (дубликаты внутри одного чекпоинта схлопываются)
    file_map: dict[str, str] = {}  # original_filename → stored_as
    for original_name, content in files:
        h = hashlib.md5(content).hexdigest()
        ext = os.path.splitext(original_name)[1].lower() or ".jpg"
        stored_as = f"{h}{ext}"
        path = os.path.join(images_dir, stored_as)

        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(content)

        file_map[original_name] = stored_as

    # 4. Проставляем stored_as в payload
    images = payload.get("images", [])
    for img in images:
        img["stored_as"] = file_map.get(img.get("filename", ""), "")

    # 5. Метаданные
    payload["name"] = name
    payload["saved_at"] = datetime.now().isoformat()
    payload["n_images"] = len(images)

    # 6. Пишем JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    _cleanup_old()

    return {
        "filename": filename,
        "saved_at": payload["saved_at"],
        "n_images": len(images),
    }


# ---------- Список ----------

def list_checkpoints() -> list[dict]:
    """Список чекпоинтов (свежие сверху)."""
    if not os.path.isdir(CHECKPOINT_DIR):
        return []

    result = []
    for fname in sorted(os.listdir(CHECKPOINT_DIR), reverse=True):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHECKPOINT_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue

        result.append({
            "filename": fname,
            "name": data.get("name", fname),
            "saved_at": data.get("saved_at", ""),
            "n_images": data.get("n_images", 0),
            "threshold": data.get("threshold", 0.8),
            "has_metrics": bool(data.get("metrics")),
        })
    return result


# ---------- Загрузка ----------

def load_checkpoint(filename: str) -> dict | None:
    """Читает JSON чекпоинта. Возвращает None, если не найден."""
    safe = os.path.basename(filename)
    path = os.path.join(CHECKPOINT_DIR, safe)
    if not os.path.isfile(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_checkpoint_image_path(filename: str, image_name: str) -> str | None:
    """Путь к фото из папки чекпоинта. None — если нет."""
    safe = os.path.basename(filename)
    # Убираем .json из имени папки
    if safe.endswith(".json"):
        safe = safe[:-5]
    safe_img = os.path.basename(image_name)
    path = os.path.join(CHECKPOINT_DIR, safe, safe_img)
    if os.path.isfile(path):
        return path
    return None


# ---------- Удаление ----------

def delete_checkpoint(filename: str) -> bool:
    """Удаляет JSON и папку с фото. True — если файл был."""
    safe = os.path.basename(filename)
    json_path = os.path.join(CHECKPOINT_DIR, safe)
    if not os.path.isfile(json_path):
        return False

    # Удаляем JSON
    os.remove(json_path)

    # Удаляем папку с фото
    images_dir = _checkpoint_dir_for(safe)
    if os.path.isdir(images_dir):
        shutil.rmtree(images_dir, ignore_errors=True)

    return True


# ---------- Очистка старых ----------

def _cleanup_old() -> None:
    """Удаляет самые старые чекпоинты, если их больше CHECKPOINT_MAX_FILES."""
    if not os.path.isdir(CHECKPOINT_DIR):
        return

    json_files = sorted(
        f for f in os.listdir(CHECKPOINT_DIR) if f.endswith(".json")
    )
    if len(json_files) <= CHECKPOINT_MAX_FILES:
        return

    to_delete = json_files[: len(json_files) - CHECKPOINT_MAX_FILES]
    for fname in to_delete:
        path = os.path.join(CHECKPOINT_DIR, fname)
        try:
            os.remove(path)
            images_dir = _checkpoint_dir_for(fname)
            if os.path.isdir(images_dir):
                shutil.rmtree(images_dir, ignore_errors=True)
        except Exception:
            pass