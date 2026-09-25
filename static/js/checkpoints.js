// static/js/checkpoints.js — обновлённый

async function refreshCheckpoints() {
  const select = document.getElementById("checkpointSelect");
  if (!select) return;

  try {
    const data = await api.listCheckpoints();
    state.checkpoints = data.checkpoints || [];

    select.innerHTML = '<option value="">— выбрать чекпоинт —</option>';
    for (const c of state.checkpoints) {
      const dt = c.saved_at ? c.saved_at.slice(0, 19).replace("T", " ") : "";
      const metricsMark = c.has_metrics ? " · метрики" : "";
      const opt = document.createElement("option");
      opt.value = c.filename;
      opt.textContent = `${c.name} · ${c.n_images} изобр. · ${dt}${metricsMark}`;
      select.appendChild(opt);
    }
  } catch (e) {
    setStatus("Ошибка загрузки списка чекпоинтов: " + e.message, "error");
  }
}

async function saveCheckpoint() {
  if (!state.lastResult) {
    setStatus("Нечего сохранять — сначала запустите анализ", "error");
    return;
  }

  const nameInput = document.getElementById("checkpointName");
  const name = (nameInput && nameInput.value.trim()) || "checkpoint";

  const payload = {
    name,
    threshold: state.lastResult.threshold,
    images: state.lastResult.images,
    metrics: state.lastResult.metrics || null,
    labels: stateApi.getLabelsMap(),
  };

  // Собираем файлы, соответствующие img.filename
  const files = state.selectedFiles.map((item) => item.file);

  try {
    setStatus("Сохранение чекпоинта...");
    const res = await api.saveCheckpoint(payload, files);
    setStatus(`Сохранено: ${res.filename} (${res.n_images} изобр.)`, "success");
    if (nameInput) nameInput.value = "";
    await refreshCheckpoints();
  } catch (e) {
    setStatus("Ошибка сохранения: " + e.message, "error");
  }
}

async function restoreCheckpoint() {
  const select = document.getElementById("checkpointSelect");
  if (!select || !select.value) {
    setStatus("Выберите чекпоинт", "error");
    return;
  }

  const filename = select.value;

  try {
    setStatus("Загрузка чекпоинта...");
    const data = await api.getCheckpoint(filename);

    // Прокидываем в state
    state.lastResult = data;
    state.lastCheckpointFile = filename;  // ← запоминаем для URL фото

    // Восстанавливаем превью (карточки с картинками + метки)
    _restorePreviewFromCheckpoint(data, filename);

    // Рисуем результаты
    if (typeof renderResults === "function" && data.images) {
      renderResults(data);
    }

    // Метрики и графики
    if (data.metrics && data.metrics.length) {
      if (typeof renderMetrics === "function") renderMetrics(data);
      if (typeof renderCharts === "function") renderCharts(data.metrics);
    } else {
      const metricsBlock = document.getElementById("metricsBlock");
      if (metricsBlock) metricsBlock.innerHTML = "";
      const charts = document.getElementById("charts");
      if (charts) charts.innerHTML = "";
    }

    setStatus(`Восстановлено из ${filename}`, "success");
  } catch (e) {
    setStatus("Ошибка загрузки: " + e.message, "error");
  }
}

/**
 * Восстанавливает превью-карточки из чекпоинта.
 * Использует stored_as для ссылки на сохранённое фото.
 */
function _restorePreviewFromCheckpoint(data, checkpointFilename) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  if (!data.images || !data.images.length) {
    preview.innerHTML = "";
    return;
  }

  // Показываем заголовок + карточки без возможности выбора (только для просмотра)
  const nWithLabels = Object.keys(data.labels || {}).length;

  let html = `
    <div class="preview-panel-label">
      <span>Восстановлено из чекпоинта: <span class="preview-count">${data.images.length}</span></span>
      <span>С метками: <span class="preview-count">${nWithLabels} / ${data.images.length}</span></span>
    </div>
    <div class="preview-grid">
  `;

  data.images.forEach((img) => {
    const label = (data.labels && data.labels[img.filename]) || "";
    const hasLabel = label ? "has-label" : "no-label";
    const imgUrl = img.stored_as
      ? api.checkpointImageUrl(checkpointFilename, img.stored_as)
      : `/test_images/${encodeURIComponent(img.filename)}`;

    html += `
      <div class="thumb-card ${hasLabel}">
        <div class="thumb-image-wrap">
          <img src="${imgUrl}" alt="${_esc(img.filename)}" class="thumb-image">
        </div>
        <div class="thumb-info">
          <div class="thumb-name">${_esc(img.filename)}</div>
          <div class="thumb-label-static">${label ? _esc(label) : "— не указано —"}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  preview.innerHTML = html;
}

function _esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function deleteCheckpoint() {
  const select = document.getElementById("checkpointSelect");
  if (!select || !select.value) {
    setStatus("Выберите чекпоинт", "error");
    return;
  }

  const filename = select.value;
  if (!confirm(`Удалить чекпоинт «${filename}»?`)) return;

  try {
    await api.deleteCheckpoint(filename);
    setStatus(`Удалено: ${filename}`, "success");
    await refreshCheckpoints();
  } catch (e) {
    setStatus("Ошибка удаления: " + e.message, "error");
  }
}

window.refreshCheckpoints = refreshCheckpoints;
window.saveCheckpoint = saveCheckpoint;
window.restoreCheckpoint = restoreCheckpoint;
window.deleteCheckpoint = deleteCheckpoint;