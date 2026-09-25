# app/schemas.py
"""
Pydantic-схемы для всех эндпоинтов.
"""

from typing import Optional
from pydantic import BaseModel


# ---------- Инференс ----------

class PredictionItem(BaseModel):
    label: str
    confidence: float
    is_confident: bool


class ModelResult(BaseModel):
    model: str
    top: list[PredictionItem]
    top1_confident: bool
    time_ms: float


class ImageResult(BaseModel):
    filename: str
    results: list[ModelResult]


# ---------- Метрики ----------

class MetricRow(BaseModel):
    model: str
    top1_accuracy: float
    top5_accuracy: float
    macro_f1: float
    intra_class_consistency: float
    avg_confidence: float
    overconfidence_rate: float
    avg_time_ms: float
    n_evaluated: int


# ---------- Анализ ----------

class AnalyzeResponse(BaseModel):
    images: list[ImageResult]
    metrics: Optional[list[MetricRow]] = None
    n_total: int
    n_with_labels: int
    threshold: float


# ---------- Чекпоинты ----------

class CheckpointInfo(BaseModel):
    filename: str
    name: str
    saved_at: str
    n_images: int
    threshold: float
    has_metrics: bool


class CheckpointListResponse(BaseModel):
    checkpoints: list[CheckpointInfo]


class SaveCheckpointRequest(BaseModel):
    name: str = "checkpoint"
    threshold: float = 0.8
    images: list[ImageResult]
    metrics: Optional[list[MetricRow]] = None
    labels: dict[str, str] = {}


class SaveCheckpointResponse(BaseModel):
    filename: str
    saved_at: str


# ---------- Классы ----------

class ClassesResponse(BaseModel):
    all: list[str]
    used: list[str]


class TestImagesResponse(BaseModel):
    images: list[str]


class ModelsResponse(BaseModel):
    models: list[str]


class HealthResponse(BaseModel):
    status: str
    models: list[str]