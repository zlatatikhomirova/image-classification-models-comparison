# app/services/inference_service.py
"""
Сервис инференса: прогон изображений через 8 моделей.
Использует app.models.predict_all.
"""

from app.models import predict_all
from app.config import TOP_K, CONFIDENCE_THRESHOLD


def run_inference(
    image_paths: list[str],
    threshold: float = CONFIDENCE_THRESHOLD,
    top_k: int = TOP_K,
) -> list[dict]:
    """
    Прогоняет каждое изображение через все 8 моделей.

    Параметры:
      - image_paths: список путей к файлам на диске
      - threshold: порог уверенности (0..1)
      - top_k: сколько предсказаний вернуть (по умолчанию 5)

    Возвращает список словарей, по одному на изображение:
      {
        "filename": "cat_01.jpg",
        "results": [
          {
            "model": "VGG16",
            "top": [{"label": "...", "confidence": 45.2, "is_confident": False}, ...],
            "top1_confident": False,
            "time_ms": 1234.5
          },
          ...
        ]
      }
    """
    results = []

    for path in image_paths:
        # Имя файла без пути — для отображения
        import os
        filename = os.path.basename(path)

        per_model = predict_all(path, top_k=top_k, threshold=threshold)

        results.append({
            "filename": filename,
            "results": per_model,
        })

    return results