// static/js/metrics.js
/**
 * Рендер таблицы метрик и детализации по изображениям.
 */

function renderMetrics(data) {
  const container = document.getElementById("metricsBlock");
  if (!container) return;

  if (!data.metrics || !data.metrics.length) {
    container.innerHTML = "";
    return;
  }

  const metrics = data.metrics;
  const nWith = data.n_with_labels;
  const nTotal = data.n_total;

  // Плашка статуса
  let statusHtml = "";
  if (nWith === nTotal) {
    statusHtml = `
      <div class="metrics-status info">
        Оценено <strong>${nWith}</strong> из <strong>${nTotal}</strong> изображений.
        Все изображения размечены.
      </div>`;
  } else if (nWith > 0) {
    statusHtml = `
      <div class="metrics-status warn">
        Метрики рассчитаны по <strong>${nWith}</strong> из <strong>${nTotal}</strong> изображений.
        Для остальных ${nTotal - nWith} метки не указаны.
      </div>`;
  }

  // Таблица метрик
  const best = {
    top1_accuracy: Math.max(...metrics.map(m => m.top1_accuracy)),
    top5_accuracy: Math.max(...metrics.map(m => m.top5_accuracy)),
    macro_f1: Math.max(...metrics.map(m => m.macro_f1)),
    intra_class_consistency: Math.max(...metrics.map(m => m.intra_class_consistency)),
    avg_confidence: Math.max(...metrics.map(m => m.avg_confidence)),
    overconfidence_rate: Math.min(...metrics.map(m => m.overconfidence_rate)),
    avg_time_ms: Math.min(...metrics.map(m => m.avg_time_ms)),
  };

  const row = (m) => {
    const cls = (key, val) =>
      val === best[key] ? "num best" : "num";
    return `
      <tr>
        <td class="model-name">${escapeHtml(m.model)}</td>
        <td class="${cls('top1_accuracy', m.top1_accuracy)}">${m.top1_accuracy}</td>
        <td class="${cls('top5_accuracy', m.top5_accuracy)}">${m.top5_accuracy}</td>
        <td class="${cls('macro_f1', m.macro_f1)}">${m.macro_f1}</td>
        <td class="${cls('intra_class_consistency', m.intra_class_consistency)}">${m.intra_class_consistency}</td>
        <td class="${cls('avg_confidence', m.avg_confidence)}">${m.avg_confidence}</td>
        <td class="${cls('overconfidence_rate', m.overconfidence_rate)}">${m.overconfidence_rate}</td>
        <td class="${cls('avg_time_ms', m.avg_time_ms)}">${m.avg_time_ms}</td>
      </tr>`;
  };

  const tableHtml = `
    <h3>Метрики по моделям</h3>
    <div class="metrics-table-wrap">
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Модель</th>
            <th>Top-1, %</th>
            <th>Top-5, %</th>
            <th>Macro-F1</th>
            <th>Согл., %</th>
            <th>Увер., %</th>
            <th>Увер. ошибки, %</th>
            <th>Время, мс</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.map(row).join("")}
        </tbody>
      </table>
    </div>
  `;

  // Детализация по изображениям
  const detailsHtml = _renderPerImageDetails(data);

  container.innerHTML = statusHtml + tableHtml + detailsHtml;
}

/* ---------- Детализация по изображениям ---------- */

function _renderPerImageDetails(data) {
  if (!data.images || !data.images.length) return "";

  // Группируем предсказания по имени файла
  const byFile = {};
  for (const img of data.images) {
    byFile[img.filename] = { results: img.results };
  }

  const labelsMap = stateApi.getLabelsMap();

  let html = `<div class="per-image-details">
    <h3>Детализация по изображениям</h3>`;

  for (const [fname, info] of Object.entries(byFile)) {
    const trueLabel = labelsMap[fname] || "—";

    // Считаем, сколько моделей угадали
    let correct = 0;
    for (const r of info.results) {
      if (r.top[0].label === trueLabel) correct++;
    }
    const nModels = info.results.length;

    const rows = info.results.map((r) => {
      const t1 = r.top[0];
      const isCorrect = t1.label === trueLabel;
      return `
        <tr>
          <td class="model-name">${escapeHtml(r.model)}</td>
          <td>${escapeHtml(t1.label)}</td>
          <td class="num">${t1.confidence}%</td>
          <td>${isCorrect ? "да" : "нет"}</td>
          <td class="num">${r.time_ms}</td>
        </tr>
      `;
    }).join("");

    html += `
      <details class="per-image-item">
        <summary>
          <span>${escapeHtml(fname)}</span>
          <span class="summary-right">
            <span class="per-image-true">${escapeHtml(trueLabel)}</span>
            <span>${correct} / ${nModels}</span>
          </span>
        </summary>
        <div class="per-image-body">
          <table class="metrics-table">
            <thead>
              <tr>
                <th>Модель</th>
                <th>Предсказание</th>
                <th>Уверенность</th>
                <th>Верно</th>
                <th>Время, мс</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>
    `;
  }

  html += `</div>`;
  return html;
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

window.renderMetrics = renderMetrics;