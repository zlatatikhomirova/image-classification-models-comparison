# app/models.py

import time
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.imagenet_utils import decode_predictions


_MODELS = {
    "VGG16": {
        "model": tf.keras.applications.VGG16(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.vgg16.preprocess_input,
    },
    "ResNet50": {
        "model": tf.keras.applications.ResNet50(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.resnet50.preprocess_input,
    },
    "InceptionV3": {
        "model": tf.keras.applications.InceptionV3(weights="imagenet"),
        "size": (299, 299),
        "preprocess": tf.keras.applications.inception_v3.preprocess_input,
    },
    "DenseNet121": {
        "model": tf.keras.applications.DenseNet121(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.densenet.preprocess_input,
    },
    "Xception": {
        "model": tf.keras.applications.Xception(weights="imagenet"),
        "size": (299, 299),
        "preprocess": tf.keras.applications.xception.preprocess_input,
    },
    "MobileNetV2": {
        "model": tf.keras.applications.MobileNetV2(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.mobilenet_v2.preprocess_input,
    },
    "EfficientNetB0": {
        "model": tf.keras.applications.EfficientNetB0(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.efficientnet.preprocess_input,
    },
    "EfficientNetV2B0": {
        "model": tf.keras.applications.EfficientNetV2B0(weights="imagenet"),
        "size": (224, 224),
        "preprocess": tf.keras.applications.efficientnet_v2.preprocess_input,
    },
}


def available_models() -> list[str]:
    return list(_MODELS.keys())


def predict(model_name: str, image_path: str,
            top_k: int = 5, threshold: float = 0.8) -> dict:
    cfg = _MODELS[model_name]
    img = Image.open(image_path).convert("RGB").resize(cfg["size"])
    arr = np.array(img, dtype=np.float32)
    arr = cfg["preprocess"](arr)
    arr = np.expand_dims(arr, axis=0)

    t0 = time.perf_counter()
    preds = cfg["model"].predict(arr, verbose=0)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    decoded = decode_predictions(preds, top=top_k)[0]
    top1_conf = float(decoded[0][2])

    return {
        "model": model_name,
        "top": [
            {
                "label": d[1],
                "confidence": round(float(d[2]) * 100, 2),
                "is_confident": float(d[2]) >= threshold,
            }
            for d in decoded
        ],
        "top1_confident": top1_conf >= threshold,
        "time_ms": round(elapsed_ms, 1),
    }


def predict_all(image_path: str, top_k: int = 5,
                threshold: float = 0.8) -> list[dict]:
    return [predict(name, image_path, top_k, threshold) for name in _MODELS]

