# prepare_test_set.py
"""
Готовит тестовый набор:
- Читает картинки из test_images_raw/<class>/*.jpg
- Переименовывает в <class>_<NN>.jpg
- Копирует в test_images/
- Генерирует test_images/labels.csv
"""

import os
import csv
import shutil
import re

RAW_DIR = "test_images_raw"
OUT_DIR = "test_images"
LABELS_FILE = os.path.join(OUT_DIR, "labels.csv")

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def prepare():
    if not os.path.isdir(RAW_DIR):
        print(f"Нет папки {RAW_DIR}/")
        return

    os.makedirs(OUT_DIR, exist_ok=True)

    # Не трогаем labels.csv, если он уже есть? Или перезаписываем — на выбор.
    rows = []
    classes = sorted(
        d for d in os.listdir(RAW_DIR)
        if os.path.isdir(os.path.join(RAW_DIR, d))
    )

    if not classes:
        print(f"В {RAW_DIR}/ нет подпапок с классами")
        return

    print(f"Найдено классов: {len(classes)}")

    for cls in classes:
        cls_dir = os.path.join(RAW_DIR, cls)
        files = sorted(
            f for f in os.listdir(cls_dir)
            if os.path.splitext(f)[1].lower() in ALLOWED_EXT
        )

        if not files:
            print(f"  [{cls}] пусто — пропускаю")
            continue

        print(f"  [{cls}] {len(files)} файлов")

        for i, fname in enumerate(files, start=1):
            ext = os.path.splitext(fname)[1].lower()
            new_name = f"{cls}_{i:02d}{ext}"
            src = os.path.join(cls_dir, fname)
            dst = os.path.join(OUT_DIR, new_name)

            shutil.copy2(src, dst)
            rows.append({"filename": new_name, "true_label": cls})

    # Пишем labels.csv
    with open(LABELS_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "true_label"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nГотово. Скопировано {len(rows)} файлов.")
    print(f"labels.csv: {LABELS_FILE}")


if __name__ == "__main__":
    prepare()