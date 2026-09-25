// static/js/charts.js
/**
 * Графики без библиотек — горизонтальные CSS-бары.
 * Используются в сводке сверху.
 */

function renderCharts(metrics) {
  const container = document.getElementById("charts");
  if (!container) return;

  if (!metrics || !metrics.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="charts-grid" id="chartsGrid"></div>
  `;
  const grid = document.getElementById("chartsGrid");

  _addChart(grid, "Top-1 accuracy", "Доля изображений, где правильный класс первый по вероятности", metrics, "top1_accuracy",
    (v) => v.toFixed(1) + "%", "");

  _addChart(grid, "Top-5 accuracy", "Правильный класс попал в топ-5 предсказаний", metrics, "top5_accuracy",
    (v) => v.toFixed(1) + "%", "");

  _addChart(grid, "Macro-F1", "Среднее гармоническое precision и recall по классам", metrics, "macro_f1",
    (v) => v.toFixed(3), "chart-f1");

  _addChart(grid, "Внутриклассовая согласованность", "Насколько стабильны предсказания внутри класса", metrics, "intra_class_consistency",
    (v) => v.toFixed(1) + "%", "chart-confidence");

  _addChart(grid, "Средняя уверенность", "Средняя вероятность Top-1 предсказания", metrics, "avg_confidence",
    (v) => v.toFixed(1) + "%", "chart-confidence");

  _addChart(grid, "Доля уверенных ошибок", "Доля ошибок с уверенностью выше порога (меньше — лучше)", metrics, "overconfidence_rate",
    (v) => v.toFixed(1) + "%", "chart-overconf");

  _addChart(grid, "Среднее время инференса", "Среднее время обработки одного изображения", metrics, "avg_time_ms",
    (v) => v.toFixed(0) + " мс", "chart-time");
}

/* ---------- Один график ---------- */

function _addChart(container, title, description, data, valueKey, formatFn, colorClass) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values);
  const min = Math.min(...values);

  const isTimeMetric = valueKey === "avg_time_ms";
  const isErrorMetric = valueKey === "overconfidence_rate";
  const bestValue = (isTimeMetric || isErrorMetric) ? min : max;

  let html = `
    <div class="chart-card ${colorClass}">
      <div class="chart-title">${escapeHtml(title)}</div>
      <div class="chart-description">${escapeHtml(description)}</div>
  `;

  const sorted = data.slice().sort((a, b) => {
    if (isTimeMetric || isErrorMetric) return a[valueKey] - b[valueKey];
    return b[valueKey] - a[valueKey];
  });

  for (const row of sorted) {
    const val = row[valueKey];
    const pct = max > 0 ? (val / max) * 100 : 0;
    const isBest = val === bestValue;
    const cls = isBest ? "chart-row best" : "chart-row";

    html += `
      <div class="${cls}" title="${escapeHtml(row.model)}: ${formatFn(val)}">
        <span class="chart-label">${escapeHtml(row.model)}</span>
        <div class="chart-track">
          <div class="chart-fill" style="width: ${pct}%"></div>
        </div>
        <span class="chart-value">${formatFn(val)}</span>
      </div>
    `;
  }

  html += `</div>`;
  container.insertAdjacentHTML("beforeend", html);
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

window.renderCharts = renderCharts;