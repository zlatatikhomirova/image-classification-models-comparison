# Image Classification Models Comparison

Веб-приложение для сравнения восьми предобученных нейронных сетей
на задаче классификации изображений.

## Описание

Проект представляет собой веб-сервис, который:

- принимает одно или несколько изображений от пользователя;
- прогоняет их через восемь моделей Keras Applications;
- возвращает Top-1 и Top-5 предсказания, уверенность и время
  инференса для каждой модели;
- рассчитывает метрики качества, если указаны истинные классы.

## Модели

- VGG16
- ResNet50
- InceptionV3
- DenseNet121
- Xception
- MobileNetV2
- EfficientNetB0
- EfficientNetV2B0

## Метрики

- Top-1 accuracy
- Top-5 accuracy
- Macro-F1
- Внутриклассовая согласованность
- Средняя уверенность
- Доля уверенных ошибок
- Среднее время инференса

## Стек

- Python 3.10+
- FastAPI + Uvicorn
- TensorFlow / Keras (Keras Applications)
- Jinja2, HTML, CSS, JavaScript
- Tom Select, KaTeX

## Структура

```
app/           — backend (FastAPI)
static/        — CSS, JS, библиотеки
templates/     — HTML-шаблоны
test_images/   — тестовый набор
results/       — чекпоинты
```

## Установка

1. Клонировать репозиторий:

   ```
   git clone https://github.com/zlatatikhomirova/image-classification-models-comparison.git
   cd image-classification-models-comparison
   ```

2. Создать виртуальное окружение и установить зависимости:

   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Запустить сервер:

   ```
   uvicorn app.main:app --reload
   ```

4. Открыть в браузере:

   - Веб-интерфейс: http://localhost:8000/
   - Swagger: http://localhost:8000/docs

## Как пользоваться

1. Загрузите изображения или тестовый набор.
2. Укажите истинные классы (если нужны метрики).
3. Настройте порог уверенности.
4. Нажмите "Сравнить".

## Скриншоты

<img width="2993" height="2097" alt="image" src="https://github.com/user-attachments/assets/6bb7ab0d-54c9-4094-a416-a32263f2516c" />


## Лицензия

Учебный проект, MIT
