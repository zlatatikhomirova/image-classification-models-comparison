// static/js/analyze.js
/**
 * Запуск анализа и пересчёт метрик.
 *
 *  - Первый запуск — прогон всех файлов.
 *  - Добавление новых — прогон ТОЛЬКО новых.
 *  - Результаты аккумулируются в state.lastResult.images.
 *  - Метрики считаются на фронте через calcMetrics().
 *  - При изменении порога — пересчёт без запроса.
 *
 * Рендер результатов — в metrics.js (renderMetrics).
 */

/* ---------- Основная функция ---------- */

async function runAnalyze() {
  if (stateApi.isEmpty()) {
    setStatus("Сначала выберите хотя бы одно изображение", "error");
    return;
  }

  if (state.isProcessing) return;

  // Синхронизация: убираем результаты удалённых файлов
  if (state.lastResult && state.lastResult.images) {
    const currentNames = new Set(
      state.selectedFiles.map((it) => it.file.name)
    );
    state.lastResult.images = state.lastResult.images.filter(
      (img) => currentNames.has(img.filename)
    );
    state.lastResult.n_total = state.lastResult.images.length;
  }

  const alreadyDone = _getProcessedFilenames();
  const newItems = state.selectedFiles.filter(
    (item) => !alreadyDone.has(item.file.name)
  );

  if (newItems.length === 0) {
    _recalcAndRender();
    setStatus("Готово (пересчёт)", "success");
    return;
  }

  state.isProcessing = true;
  const btn = document.getElementById("analyzeBtn");
  if (btn) btn.disabled = true;

  setStatus(`Обработка ${newItems.length} новых изображений...`);
  _showProgress(0, newItems.length);

  try {
    const files = newItems.map((it) => it.file);
    const data = await api.analyze(files);
    _showProgress(newItems.length, newItems.length);

    if (!state.lastResult) {
      state.lastResult = { images: [], n_total: 0 };
    }

    for (const img of data.images) {
      state.lastResult.images.push(img);
    }
    state.lastResult.n_total = state.lastResult.images.length;

    _recalcAndRender();
    setStatus("Готово", "success");
  } catch (e) {
    setStatus("Ошибка: " + e.message, "error");
  } finally {
    state.isProcessing = false;
    if (btn) btn.disabled = false;
    _hideProgress();
  }
}

/* ---------- Пересчёт и рендер ---------- */

function _recalcAndRender() {
  if (!state.lastResult) return;

  const images = state.lastResult.images;
  const labels = stateApi.getLabelsMap();
  const threshold = state.threshold;

  const nWithLabels = images.filter((img) => labels[img.filename]).length;

  if (nWithLabels > 0 && typeof calcMetrics === "function") {
    state.lastResult.metrics = calcMetrics(images, labels, threshold);
  } else {
    state.lastResult.metrics = null;
  }

  state.lastResult.n_with_labels = nWithLabels;
  state.lastResult.threshold = threshold;
  state.lastResult.labels = labels;

  // Гистограммы (метрики)
  const charts = document.getElementById("charts");
  if (charts) charts.innerHTML = "";
  if (state.lastResult.metrics && state.lastResult.metrics.length) {
    if (typeof renderCharts === "function") {
      renderCharts(state.lastResult.metrics);
    }
  }

  // Детализация + формулы
  if (typeof renderMetrics === "function") {
    renderMetrics(state.lastResult);
  }
}

function recalcOnThreshold() {
  if (!state.lastResult) return;
  _recalcAndRender();
}

function _getProcessedFilenames() {
  const set = new Set();
  if (state.lastResult && state.lastResult.images) {
    for (const img of state.lastResult.images) {
      set.add(img.filename);
    }
  }
  return set;
}

/* ---------- Прогресс-бар ---------- */

function _showProgress(current, total) {
  const wrap = document.getElementById("progressWrap");
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");
  if (!wrap || !fill || !text) return;

  wrap.style.display = "block";
  const pct = total > 0 ? (current / total) * 100 : 0;
  fill.style.width = pct + "%";
  text.textContent = `${current} / ${total}`;
}

function _hideProgress() {
  const wrap = document.getElementById("progressWrap");
  if (wrap) wrap.style.display = "none";
}

/* ---------- Экспорт ---------- */

window.runAnalyze = runAnalyze;
window.recalcOnThreshold = recalcOnThreshold;