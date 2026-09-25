# app/services/classes_service.py
"""
Сервис для работы со списком классов ImageNet.
Читает imagenet_class_index.json и возвращает плоский список меток.
"""

import json
import os
from functools import lru_cache

from app.config import CLASSES_FILE


@lru_cache(maxsize=1)
def get_all_classes() -> list[str]:
    """
    Возвращает отсортированный список всех 1000 классов ImageNet
    в формате Keras (например, 'tabby', 'golden_retriever').
    Результат кэшируется в памяти.
    """
    if not os.path.isfile(CLASSES_FILE):
        return []

    with open(CLASSES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # data = {"0": ["n01440764", "tench"], "1": [...], ...}
    classes = sorted({v[1] for v in data.values() if len(v) >= 2})
    return classes


def get_used_classes() -> list[str]:
    """
    Возвращает уникальные классы, которые встречаются
    в test_images/labels.csv (используются в тестовом наборе).
    """
    import csv
    from app.config import TEST_DIR

    labels_file = os.path.join(TEST_DIR, "labels.csv")
    if not os.path.isfile(labels_file):
        return []

    classes = set()
    with open(labels_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = (row.get("true_label") or "").strip()
            if label:
                classes.add(label)
    return sorted(classes)