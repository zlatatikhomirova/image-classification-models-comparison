// static/js/analyze.js
/**
 * Запуск анализа: сбор файлов + меток, POST /api/analyze, рендер результатов.
 */

/* ---------- Основная функция ---------- */

async function runAnalyze() {
  if (stateApi.isEmpty()) {
    setStatus("Сначала выберите хотя бы одно изображение", "error");
    return;
  }

  if (state.isProcessing) return;
  state.isProcessing = true;

  const btn = document.getElementById("analyzeBtn");
  if (btn) btn.disabled = true;

  const files = stateApi.getFiles();
  const labels = stateApi.getLabelsMap();
  const threshold = state.threshold;

  setStatus(`Обработка ${files.length} изображений через 8 моделей...`);

  // Показываем прогресс-бар (грубый, т.к. точного прогресса от сервера нет)
  _showProgress(0, files.length);

  try {
    const data = await api.analyze(files, labels, threshold);
    state.lastResult = data;
    state.lastCheckpointFile = null;  

    _showProgress(files.length, files.length);

    renderResults(data);

    // Если метрики есть — рендерим таблицу, графики, детализацию
    if (data.metrics && data.metrics.length) {
      if (typeof renderMetrics === "function") renderMetrics(data);
      if (typeof renderCharts === "function") renderCharts(data.metrics);
    } else {
      const metricsBlock = document.getElementById("metricsBlock");
      if (metricsBlock) {
        metricsBlock.innerHTML = `
          <div class="metrics-status warn">
            Метки не указаны — метрики не рассчитаны. Укажите истинные классы
            в превью, чтобы получить accuracy, F1 и другие метрики.
          </div>
        `;
      }
      const charts = document.getElementById("charts");
      if (charts) charts.innerHTML = "";
    }

    setStatus("Готово", "success");
  } catch (e) {
    setStatus("Ошибка: " + e.message, "error");
  } finally {
    state.isProcessing = false;
    if (btn) btn.disabled = false;
    _hideProgress();
  }
}

/* ---------- Рендер результатов ---------- */

function renderResults(data) {
  const container = document.getElementById("results");
  if (!container) return;

  if (!data.images || !data.images.length) {
    container.innerHTML = `<p>Нет результатов.</p>`;
    return;
  }

  let html = "";

  for (const img of data.images) {
    html += `<h2>${escapeHtml(img.filename)}</h2>`;
    html += `<div class="result-cards">`;

    for (const r of img.results) {
      html += _renderModelCard(r);
    }

    html += `</div>`;
  }

  container.innerHTML = html;
}

function _renderModelCard(r) {
  const t1 = r.top[0];
  const badge = r.top1_confident
    ? `<span class="status-badge status-confident">уверенно</span>`
    : `<span class="status-badge status-unsure">сомневается</span>`;

  const bars = r.top.map((t) => `
    <div class="bar-row" title="${escapeHtml(t.label)}: ${t.confidence}%">
      <span class="bar-label">${escapeHtml(t.label)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${t.confidence}%"></div>
      </div>
      <span class="bar-value">${t.confidence}%</span>
    </div>
  `).join("");

  return `
    <div class="result-card">
      <div class="result-card-head">
        <span class="result-model">${escapeHtml(r.model)}</span>
        <div class="result-head-right">
          <button class="btn-link" onclick="showModelInfo('${r.model}')">о модели</button>
          <span class="result-time">${r.time_ms} мс</span>
        </div>
      </div>
      <div class="result-top1">
        Top-1: <strong>${escapeHtml(t1.label)}</strong> · ${t1.confidence}% · ${badge}
      </div>
      <div class="bar-chart">${bars}</div>
    </div>
  `;
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

/* ---------- Хелпер ---------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Экспорт ---------- */

window.runAnalyze = runAnalyze;
window.renderResults = renderResults;