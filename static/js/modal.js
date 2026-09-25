// static/js/modal.js
/**
 * Модальные окна: "о модели" и "о моделях".
 */

const MODEL_INFO = {
  "VGG16": {
    year: 2014,
    authors: "Simonyan, Zisserman",
    params: "138 млн",
    input: "224×224",
    description:
      "Классическая свёрточная сеть, состоящая только из свёрток 3×3 и " +
      "pooling-слоёв. Отличается простотой и однородностью архитектуры, " +
      "но содержит большое количество параметров, из-за чего медленная " +
      "и требовательная к памяти.",
    idea:
      "Увеличение глубины сети за счёт стека последовательных свёрток " +
      "маленького размера вместо крупных ядер.",
  },
  "ResNet50": {
    year: 2015,
    authors: "He et al.",
    params: "25.6 млн",
    input: "224×224",
    description:
      "Остаточная сеть с 50 слоями. Использует skip connections — " +
      "связи, которые передают входной сигнал в обход нескольких слоёв. " +
      "Это решает проблему затухания градиента при большой глубине сети.",
    idea:
      "Residual learning: слои обучаются предсказывать не выход, " +
      "а разницу между входом и выходом (residual).",
  },
  "InceptionV3": {
    year: 2015,
    authors: "Szegedy et al.",
    params: "23.9 млн",
    input: "299×299",
    description:
      "Сеть с модулями Inception, в которых параллельно применяются " +
      "свёртки разных размеров (1×1, 3×3, 5×5) и pooling. " +
      "Факторизация свёрток снижает вычислительную сложность.",
    idea:
      "Многомасштабное представление: признаки извлекаются ядрами " +
      "разных размеров и объединяются в одном слое.",
  },
  "DenseNet121": {
    year: 2017,
    authors: "Huang et al.",
    params: "8 млн",
    input: "224×224",
    description:
      "Плотная сеть, в которой каждый слой получает на вход выходы " +
      "всех предыдущих слоёв. Это улучшает передачу градиента " +
      "и снижает число параметров за счёт повторного использования признаков.",
    idea:
      "Dense connectivity: каждый слой связан со всеми предыдущими, " +
      "что даёт эффективное повторное использование признаков.",
  },
  "Xception": {
    year: 2017,
    authors: "Chollet",
    params: "22.9 млн",
    input: "299×299",
    description:
      "Расширение идеи Inception: depthwise separable свёртки " +
      "применяются везде, а не только в модулях. Сеть глубже и " +
      "эффективнее по соотношению точность/параметры.",
    idea:
      "Разделение пространственной и канальной свёрток: " +
      "depthwise conv + pointwise conv.",
  },
  "MobileNetV2": {
    year: 2018,
    authors: "Sandler et al.",
    params: "3.5 млн",
    input: "224×224",
    description:
      "Лёгкая сеть для мобильных устройств. Использует inverted " +
      "residuals и linear bottlenecks. Минимальное число параметров " +
      "при хорошей точности, что делает её самой быстрой в сравнении.",
    idea:
      "Оптимизация под мобильные вычисления: depthwise separable " +
      "свёртки и линейные узкие места.",
  },
  "EfficientNetB0": {
    year: 2019,
    authors: "Tan, Le",
    params: "5.3 млн",
    input: "224×224",
    description:
      "Базовая модель семейства EfficientNet. Использует compound " +
      "scaling — одновременное масштабирование глубины, ширины " +
      "и разрешения входа по единой формуле.",
    idea:
      "Сбалансированное масштабирование всех трёх измерений сети " +
      "вместо произвольного увеличения одного.",
  },
  "EfficientNetV2B0": {
    year: 2021,
    authors: "Tan, Le",
    params: "7.1 млн",
    input: "224×224",
    description:
      "Улучшенная версия EfficientNet. Использует Fused-MBConv " +
      "слои, обучается быстрее и даёт более высокую точность " +
      "при том же размере по сравнению с EfficientNetB0.",
    idea:
      "Fused-MBConv + прогрессивное обучение: постепенное " +
      "увеличение разрешения входа в процессе тренировки.",
  },
};

/* ---------- Хелпер ---------- */

function _getOverlay() {
  return document.getElementById("modalOverlay");
}

function _esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Модалка "о модели" ---------- */

function showModelInfo(modelName) {
  const info = MODEL_INFO[modelName];
  if (!info) return;

  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  const overlay = _getOverlay();
  if (!title || !body || !overlay) return;

  title.textContent = modelName;
  body.innerHTML = `
    <p>${info.description}</p>
    <div class="meta">
      <span class="meta-key">Год</span>
      <span class="meta-value">${info.year}</span>

      <span class="meta-key">Авторы</span>
      <span class="meta-value">${info.authors}</span>

      <span class="meta-key">Параметры</span>
      <span class="meta-value">${info.params}</span>

      <span class="meta-key">Вход</span>
      <span class="meta-value">${info.input}</span>

      <span class="meta-key">Ключевая идея</span>
      <span class="meta-value">${info.idea}</span>
    </div>
  `;
  overlay.classList.add("active");
}

/* ---------- Модалка "о моделях" ---------- */

function showAllModels() {
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  const overlay = _getOverlay();
  if (!title || !body || !overlay) return;

  title.textContent = "Модели";

  const rows = Object.entries(MODEL_INFO).map(([name, info]) => `
    <tr>
      <td class="model-name">${_esc(name)}</td>
      <td class="num">${info.year}</td>
      <td>${_esc(info.authors)}</td>
      <td>${_esc(info.params)}</td>
      <td>${_esc(info.input)}</td>
      <td>${_esc(info.idea)}</td>
    </tr>
  `).join("");

  body.innerHTML = `
    <table class="models-table">
      <thead>
        <tr>
          <th>Модель</th>
          <th>Год</th>
          <th>Авторы</th>
          <th>Параметры</th>
          <th>Вход</th>
          <th>Идея</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  overlay.classList.add("active");
}

/* ---------- Закрытие ---------- */

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const overlay = _getOverlay();
  if (overlay) overlay.classList.remove("active");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const overlay = _getOverlay();
    if (overlay) overlay.classList.remove("active");
  }
});

/* ---------- Экспорт ---------- */

window.showModelInfo = showModelInfo;
window.showAllModels = showAllModels;
window.closeModal = closeModal;
window.MODEL_INFO = MODEL_INFO;