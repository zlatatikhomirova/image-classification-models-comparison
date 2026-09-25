// static/js/preview.js
/**
 * Рендер превью-карточек.
 *
 * Два режима:
 *  1. Обычный — карточки с combobox и кнопкой удаления.
 *  2. Из чекпоинта — статичные карточки (только просмотр).
 */

/* ---------- Tom Select ---------- */

function initCombobox(selectEl, selectedValue, index) {
  if (typeof TomSelect === "undefined") {
    console.warn("Tom Select не загружен");
    return null;
  }

  return new TomSelect(selectEl, {
    options: state.allClasses.map((c) => ({ value: c, text: c })),
    items: selectedValue ? [selectedValue] : [],
    maxItems: 1,
    maxOptions: 100,
    placeholder: "Начните вводить класс...",
    allowEmptyOption: true,
    create: false,
    sortField: { field: "text", direction: "asc" },
    onChange: (value) => {
      stateApi.setLabel(index, value);
      const card = selectEl.closest(".thumb-card");
      if (card) {
        card.classList.toggle("has-label", !!value);
        card.classList.toggle("no-label", !value);
      }
      if (state.lastResult && typeof recalcOnThreshold === "function") {
        recalcOnThreshold();
      }
    },
  });
}

/* ---------- Рендер превью ---------- */

function renderPreview() {
  const container = document.getElementById("preview");
  if (!container) return;

  if (state.lastCheckpointFile) {
    _renderCheckpointPreview(container);
    return;
  }

  const files = state.selectedFiles;

  if (!files.length) {
    container.innerHTML = "";
    return;
  }

  let cardsHtml = `<div class="preview-grid">`;
  files.forEach((item, i) => {
    const hasLabel = item.label ? "has-label" : "no-label";
    cardsHtml += `
      <div class="thumb-card ${hasLabel}" data-index="${i}">
        <div class="thumb-image-wrap">
          <img src="${item.previewUrl}" alt="${escapeHtml(item.file.name)}" class="thumb-image">
          <button class="thumb-remove" onclick="removeFileAndRerender(${i})" title="Удалить">x</button>
        </div>
        <div class="thumb-info">
          <div class="thumb-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</div>
          <select class="label-select" id="label-select-${i}" data-index="${i}">
            <option value="">— не указано —</option>
          </select>
        </div>
      </div>
    `;
  });
  cardsHtml += `</div>`;

  container.innerHTML = cardsHtml;

  files.forEach((item, i) => {
    const selectEl = document.getElementById(`label-select-${i}`);
    if (!selectEl) return;
    initCombobox(selectEl, item.label, i);
  });
}

/* ---------- Режим чекпоинта ---------- */

function _renderCheckpointPreview(container) {
  const data = state.lastResult;
  if (!data || !data.images || !data.images.length) {
    container.innerHTML = "";
    return;
  }

  const labels = data.labels || {};
  const checkpointFilename = state.lastCheckpointFile;

  let html = `<div class="preview-grid">`;

  data.images.forEach((img) => {
    const label = labels[img.filename] || "";
    const hasLabel = label ? "has-label" : "no-label";

    let imgUrl;
    if (img.stored_as && checkpointFilename) {
      imgUrl = api.checkpointImageUrl(checkpointFilename, img.stored_as);
    } else {
      imgUrl = `/test_images/${encodeURIComponent(img.filename)}`;
    }

    html += `
      <div class="thumb-card ${hasLabel}">
        <div class="thumb-image-wrap">
          <img src="${imgUrl}" alt="${escapeHtml(img.filename)}"
               class="thumb-image"
               onerror="this.style.background='#eee'; this.alt='нет фото';">
        </div>
        <div class="thumb-info">
          <div class="thumb-name" title="${escapeHtml(img.filename)}">${escapeHtml(img.filename)}</div>
          <div class="thumb-label-static">${label ? escapeHtml(label) : "— не указано —"}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

/* ---------- Удаление файла ---------- */

function removeFileAndRerender(index) {
  if (state.lastCheckpointFile) return;

  const item = state.selectedFiles[index];
  const filename = item ? item.file.name : null;

  // Находим upload_id в state.lastResult
  let uploadId = null;
  if (state.lastResult && state.lastResult.images) {
    const found = state.lastResult.images.find(
      (img) => img.filename === filename
    );
    if (found) uploadId = found.upload_id;
  }

  stateApi.removeFile(index);

  // Удаляем файл с сервера
  if (uploadId) {
    api.deleteUpload(uploadId).catch(() => {});
  }

  // Убираем из state.lastResult
  if (filename && state.lastResult && state.lastResult.images) {
    state.lastResult.images = state.lastResult.images.filter(
      (img) => img.filename !== filename
    );
    state.lastResult.n_total = state.lastResult.images.length;
  }

  // Если файлов не осталось — сбрасываем всё
  if (state.selectedFiles.length === 0) {
    state.lastResult = null;
    state.lastCheckpointFile = null;

    const results = document.getElementById("results");
    const metricsBlock = document.getElementById("metricsBlock");
    const charts = document.getElementById("charts");
    if (results) results.innerHTML = "";
    if (metricsBlock) metricsBlock.innerHTML = "";
    if (charts) charts.innerHTML = "";

    renderPreview();
    return;
  }

  // Пересчёт метрик
  if (state.lastResult && state.lastResult.images.length > 0) {
    if (typeof recalcOnThreshold === "function") {
      recalcOnThreshold();
    }
  }

  renderPreview();
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

window.renderPreview = renderPreview;
window.removeFileAndRerender = removeFileAndRerender;
window.initCombobox = initCombobox;