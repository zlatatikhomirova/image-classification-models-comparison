# app/config.py
"""
Централизованные настройки проекта.
Все пути, константы, лимиты — здесь.
"""

import os

# ---------- Пути ----------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
TEST_DIR = os.path.join(BASE_DIR, "test_images")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
CHECKPOINT_DIR = os.path.join(RESULTS_DIR, "checkpoints")
CLASSES_FILE = os.path.join(BASE_DIR, "app", "data", "imagenet_class_index.json")

# Автоматически создаём нужные папки
for _dir in (UPLOAD_DIR, TEST_DIR, RESULTS_DIR, CHECKPOINT_DIR):
    os.makedirs(_dir, exist_ok=True)

# ---------- Константы ----------
TOP_K = 5                       # Top-K предсказаний от каждой модели
CONFIDENCE_THRESHOLD = 0.8      # порог уверенности по умолчанию
MAX_IMAGES = 50                 # максимум картинок за один запрос

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# ---------- Чекпоинты ----------
CHECKPOINT_MAX_FILES = 100      # максимум чекпоинтов в папке (старые удаляются)