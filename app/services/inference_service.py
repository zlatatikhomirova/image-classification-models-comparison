# app/services/inference_service.py
"""
Сервис инференса: прогон изображений через 8 моделей.
Пороги и метрики здесь НЕ считаются — это задача фронтенда.
"""

import os

from app.models import predict_all
from app.config import TOP_K


def run_inference(image_paths: list[str], top_k: int = TOP_K) -> list[dict]:
    """
    Прогоняет каждое изображение через все 8 моделей.

    Параметры:
      - image_paths: список путей к файлам на диске
      - top_k: сколько предсказаний вернуть (по умолчанию 5)

    Возвращает:
      [
        {
          "filename": "cat_01.jpg",
          "results": [
            {"model": "VGG16", "top": [{"label": ..., "confidence": ...}, ...], "time_ms": ...},
            ...
          ]
        },
        ...
      ]
    """
    results = []

    for path in image_paths:
        filename = os.path.basename(path)
        per_model = predict_all(path, top_k=top_k)
        results.append({
            "filename": filename,
            "results": per_model,
        })

    return results