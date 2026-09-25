# app/services/evaluation_service.py
"""
Сервис оценки: расчёт метрик качества классификации
на основе предсказаний и истинных меток.

Метрики:
  - Top-1 accuracy
  - Top-5 accuracy
  - Macro-F1
  - Внутриклассовая согласованность
  - Средняя уверенность
  - Доля уверенных ошибок (overconfidence rate)
  - Среднее время инференса
"""

from collections import Counter

from sklearn.metrics import f1_score


def compute_metrics(
    predictions: list[dict],
    true_labels: dict[str, str],
    threshold: float = 0.8,
) -> list[dict]:
    """
    Считает метрики по каждой из 8 моделей.

    Параметры:
      - predictions: результат run_inference() —
          [{"filename": "cat_01.jpg", "results": [ {model, top, top1_confident, time_ms}, ... ]}, ...]
      - true_labels: {"cat_01.jpg": "tabby", "dog_01.jpg": "golden_retriever", ...}
      - threshold: порог для подсчёта уверенных ошибок

    Возвращает список словарей — по одному на модель:
      {
        "model": "VGG16",
        "top1_accuracy": 80.0,
        "top5_accuracy": 100.0,
        "macro_f1": 0.78,
        "intra_class_consistency": 85.0,
        "avg_confidence": 72.3,
        "overconfidence_rate": 5.0,
        "avg_time_ms": 1250.4,
        "n_evaluated": 10
      }

    Если для какого-то изображения метки нет — оно пропускается
    при подсчёте метрик (но остаётся в preds_by_model для UI).
    """
    # Собираем имена моделей из первого изображения
    if not predictions:
        return []

    model_names = [r["model"] for r in predictions[0]["results"]]

    # Для каждой модели — свои списки
    y_true_by_model: dict[str, list[str]] = {m: [] for m in model_names}
    y_pred_by_model: dict[str, list[str]] = {m: [] for m in model_names}
    conf_by_model: dict[str, list[float]] = {m: [] for m in model_names}
    time_by_model: dict[str, list[float]] = {m: [] for m in model_names}
    overconf_by_model: dict[str, int] = {m: 0 for m in model_names}
    preds_by_class_by_model: dict[str, dict[str, list[str]]] = {
        m: {} for m in model_names
    }
    n_by_model: dict[str, int] = {m: 0 for m in model_names}

    for img in predictions:
        fname = img["filename"]
        true_label = true_labels.get(fname)
        if not true_label:
            continue  # пропускаем изображения без меток

        for r in img["results"]:
            model = r["model"]
            top1 = r["top"][0]
            pred_label = top1["label"]
            conf = top1["confidence"] / 100.0  # обратно в 0..1

            y_true_by_model[model].append(true_label)
            y_pred_by_model[model].append(pred_label)
            conf_by_model[model].append(conf)
            time_by_model[model].append(r["time_ms"])
            n_by_model[model] += 1

            if pred_label != true_label and conf > threshold:
                overconf_by_model[model] += 1

            preds_by_class_by_model[model].setdefault(true_label, []).append(pred_label)

    # Считаем метрики по каждой модели
    rows = []
    for model in model_names:
        n = n_by_model[model]
        if n == 0:
            continue

        y_true = y_true_by_model[model]
        y_pred = y_pred_by_model[model]

        # Top-1 accuracy
        top1_correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
        top1_acc = top1_correct / n * 100

        # Top-5 accuracy
        top5_correct = 0
        for img in predictions:
            fname = img["filename"]
            true_label = true_labels.get(fname)
            if not true_label:
                continue
            for r in img["results"]:
                if r["model"] != model:
                    continue
                top5_labels = [t["label"] for t in r["top"][:5]]
                if true_label in top5_labels:
                    top5_correct += 1
                break
        top5_acc = top5_correct / n * 100

        # Macro-F1
        macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

        # Внутриклассовая согласованность
        consistency = _intra_class_consistency(preds_by_class_by_model[model])

        # Средняя уверенность
        avg_conf = sum(conf_by_model[model]) / n * 100

        # Доля уверенных ошибок
        overconf_rate = overconf_by_model[model] / n * 100

        # Среднее время
        avg_time = sum(time_by_model[model]) / n

        rows.append({
            "model": model,
            "top1_accuracy": round(top1_acc, 2),
            "top5_accuracy": round(top5_acc, 2),
            "macro_f1": round(macro_f1, 3),
            "intra_class_consistency": round(consistency * 100, 2),
            "avg_confidence": round(avg_conf, 2),
            "overconfidence_rate": round(overconf_rate, 2),
            "avg_time_ms": round(avg_time, 1),
            "n_evaluated": n,
        })

    return rows


def _intra_class_consistency(preds_by_class: dict[str, list[str]]) -> float:
    """
    Средняя доля самого частого предсказания внутри каждого класса.
    Возвращает число от 0 до 1.
    """
    consistencies = []
    for _, preds in preds_by_class.items():
        if not preds:
            continue
        counter = Counter(preds)
        most_common_count = counter.most_common(1)[0][1]
        consistencies.append(most_common_count / len(preds))
    if not consistencies:
        return 0.0
    return sum(consistencies) / len(consistencies)