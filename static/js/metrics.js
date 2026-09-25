// static/js/metrics.js
/**
 * Метрики + детализация по изображениям.
 * Формулы в LaTeX, рендер через KaTeX.
 */

/* ---------- Формулы и описания метрик ---------- */

const METRIC_FORMULAS = [
  {
    name: "Top-1 accuracy",
    formula: "\\frac{TP_1}{N}",
    desc: "Доля изображений, где правильный класс оказался первым по вероятности. \\(TP_1\\) — число таких изображений, \\(N\\) — общее число размеченных изображений.",
  },
  {
    name: "Top-5 accuracy",
    formula: "\\frac{TP_5}{N}",
    desc: "Доля изображений, где правильный класс попал в топ-5 предсказаний.",
  },
  {
    name: "Precision (для класса c)",
    formula: "P_c = \\frac{TP_c}{TP_c + FP_c}",
    desc: "Доля правильных среди всех, кого модель отнесла к классу \\(c\\).",
  },
  {
    name: "Recall (для класса c)",
    formula: "R_c = \\frac{TP_c}{TP_c + FN_c}",
    desc: "Доля найденных среди всех реальных объектов класса \\(c\\).",
  },
  {
    name: "F1 (для класса c)",
    formula: "F1_c = \\frac{2 \\cdot P_c \\cdot R_c}{P_c + R_c}",
    desc: "Гармоническое среднее precision и recall.",
  },
  {
    name: "Macro-F1",
    formula: "F1_{macro} = \\frac{1}{C} \\sum_{c=1}^{C} F1_c",
    desc: "Среднее F1 по всем классам без учёта размера класса. \\(C\\) — число классов.",
  },
  {
    name: "Внутриклассовая согласованность",
    formula: "\\frac{1}{K} \\sum_{k=1}^{K} \\frac{\\max(freq(pred_k))}{|class_k|}",
    desc: "Стабильность предсказаний внутри каждого класса. \\(K\\) — число классов.",
  },
  {
    name: "Средняя уверенность",
    formula: "conf_{avg} = \\frac{1}{N} \\sum_{i=1}^{N} confidence_i",
    desc: "Средняя вероятность, которую модель присвоила своему Top-1 предсказанию.",
  },
  {
    name: "Доля уверенных ошибок",
    formula: "\\frac{count(pred \\neq true \\ \\land \\ conf > \\tau)}{N}",
    desc: "Доля случаев, когда модель ошиблась, но была уверена. \\(\\tau\\) — порог уверенности.",
  },
  {
    name: "Среднее время инференса",
    formula: "t_{avg} = \\frac{1}{N} \\sum_{i=1}^{N} time_i",
    desc: "Среднее время обработки одного изображения в миллисекундах.",
  },
];

/* ---------- Основная функция ---------- */

function renderMetrics(data) {
  const container = document.getElementById("metricsBlock");
  if (!container) return;

  if (!data || !data.images || !data.images.length) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  html += _renderImageDetails(data);
  html += _renderMetricsFormulas();

  container.innerHTML = html;

  // Рендер KaTeX
  if (typeof renderMathInElement === "function") {
    renderMathInElement(container, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }
}

/* ============================================================
   ДЕТАЛИЗАЦИЯ ПО ИЗОБРАЖЕНИЯМ
   ============================================================ */

function _renderImageDetails(data) {
  const images = data.images || [];
  const labels = data.labels || {};
  const threshold = data.threshold || 0.8;

  if (!images.length) return "";

  const withLabel = [];
  const withoutLabel = [];

  images.forEach((img) => {
    const label = (labels[img.filename] || "").trim();
    if (label) withLabel.push({ img, label });
    else withoutLabel.push({ img, label: "" });
  });

  let html = `<h3 class="results-section-title">Детализация по изображениям</h3>`;

  if (withLabel.length) {
    html += `<h4 class="group-title group-with-label">С метками (${withLabel.length})</h4>`;
    html += `<div class="per-image-list">`;
    withLabel.forEach((item, i) => {
      html += _renderImageCard(item.img, item.label, i, true, threshold);
    });
    html += `</div>`;
  }

  if (withoutLabel.length) {
    html += `<h4 class="group-title group-without-label">Без меток (${withoutLabel.length})</h4>`;
    html += `<div class="per-image-list">`;
    withoutLabel.forEach((item, i) => {
      html += _renderImageCard(item.img, "", i, false, threshold);
    });
    html += `</div>`;
  }

  return html;
}

/* ---------- Одна карточка ---------- */

function _renderImageCard(img, trueLabel, index, hasLabel, threshold) {
  // Превью
  let previewUrl = null;
  if (state && state.selectedFiles) {
    const found = state.selectedFiles.find((f) => f.file.name === img.filename);
    if (found) previewUrl = found.previewUrl;
  }
  if (!previewUrl && img.stored_as && state.lastCheckpointFile) {
    previewUrl = api.checkpointImageUrl(state.lastCheckpointFile, img.stored_as);
  }

  const bigImgHtml = previewUrl
    ? `<img src="${previewUrl}" alt="" class="per-image-big">`
    : `<div class="per-image-big per-image-big-empty">нет фото</div>`;

  // Лучшая модель
  let bestModel = null;
  let bestConf = -1;
  for (const r of img.results) {
    if (r.top[0].confidence > bestConf) {
      bestConf = r.top[0].confidence;
      bestModel = r.model;
    }
  }
  const best = img.results.find((r) => r.model === bestModel);
  const bestTop1 = best ? best.top[0] : { label: "—", confidence: 0 };

  const labelHtml = hasLabel
    ? `<span class="per-image-true">истина: ${escapeHtml(trueLabel)}</span>`
    : `<span class="per-image-no-label">метка не указана</span>`;

  const statusHeader = hasLabel ? "Результат" : "Статус";

  let rows = "";
  for (const r of img.results) {
    const t1 = r.top[0];
    const isConfident = t1.confidence / 100 >= threshold;
    const isCorrect = hasLabel && t1.label === trueLabel;

    let status;
    if (hasLabel) {
      status = isCorrect
        ? `<span class="status-badge status-correct">верно</span>`
        : `<span class="status-badge status-wrong">неверно</span>`;
    } else {
      status = isConfident
        ? `<span class="status-badge status-confident">уверенно</span>`
        : `<span class="status-badge status-unsure">сомневается</span>`;
    }

    rows += `
      <tr>
        <td class="model-name">${escapeHtml(r.model)}</td>
        <td>${escapeHtml(t1.label)}</td>
        <td class="num">${t1.confidence}%</td>
        <td>${status}</td>
        <td class="num">${r.time_ms} мс</td>
        <td>
          <button class="btn-link top5-btn"
                  onclick="event.stopPropagation(); toggleTop5(this, ${index}, '${escapeHtml(r.model).replace(/'/g, "\\'")}')">
            Top-5
          </button>
        </td>
      </tr>
    `;
  }

  return `
    <details class="per-image-item" data-index="${index}">
      <summary>
        <div class="per-image-summary-left">
          <div class="per-image-summary-info">
            <div class="per-image-filename">${escapeHtml(img.filename)}</div>
            ${labelHtml}
          </div>
        </div>
        <div class="per-image-summary-right">
          <span class="per-image-best">
            <strong>${escapeHtml(bestTop1.label)}</strong>
            ${bestTop1.confidence.toFixed(1)}%
            · ${escapeHtml(bestModel || "—")}
          </span>
        </div>
      </summary>
      <div class="per-image-body">
        <div class="per-image-big-wrap">${bigImgHtml}</div>
        <table class="per-image-table">
          <thead>
            <tr>
              <th>Модель</th>
              <th>Top-1</th>
              <th>Уверенность</th>
              <th>${statusHeader}</th>
              <th>Время</th>
              <th>Top-5</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>
  `;
}

/* ============================================================
   ФОРМУЛЫ МЕТРИК
   ============================================================ */

function _renderMetricsFormulas() {
  const rows = METRIC_FORMULAS.map((e) => `
    <tr>
      <td class="mf-name">${escapeHtml(e.name)}</td>
      <td class="mf-formula">\\[${e.formula}\\]</td>
      <td class="mf-desc">${e.desc}</td>
    </tr>
  `).join("");

  return `
    <details class="metrics-explanations" open>
      <summary class="metrics-expl-summary">
        <h3 class="metrics-title">Что означают метрики?</h3>
        <span class="metrics-toggle">свернуть</span>
      </summary>
      <div class="mf-table-wrap">
        <table class="mf-table">
          <thead>
            <tr>
              <th>Метрика</th>
              <th>Формула</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>
  `;
}

/* ---------- Top-5 ---------- */

function toggleTop5(btn, imageIndex, modelName) {
  const modelRow = btn.closest("tr");
  if (!modelRow) return;

  const next = modelRow.nextElementSibling;
  if (next && next.classList.contains("top5-row")) {
    next.remove();
    btn.textContent = "Top-5";
    return;
  }

  const details = modelRow.closest(".per-image-item");
  if (details) {
    details.querySelectorAll(".top5-row").forEach((el) => el.remove());
    details.querySelectorAll(".top5-btn").forEach((b) => (b.textContent = "Top-5"));
  }

  if (!state.lastResult) return;
  const img = state.lastResult.images[imageIndex];
  if (!img) return;
  const r = img.results.find((x) => x.model === modelName);
  if (!r) return;

  const bars = r.top.map((t) => `
    <div class="bar-row" title="${escapeHtml(t.label)}: ${t.confidence}%">
      <span class="bar-label">${escapeHtml(t.label)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${t.confidence}%"></div>
      </div>
      <span class="bar-value">${t.confidence}%</span>
    </div>
  `).join("");

  const tr = document.createElement("tr");
  tr.className = "top5-row";
  tr.innerHTML = `<td colspan="6"><div class="bar-chart">${bars}</div></td>`;
  modelRow.after(tr);
  btn.textContent = "Свернуть";
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

window.renderMetrics = renderMetrics;
window.toggleTop5 = toggleTop5;