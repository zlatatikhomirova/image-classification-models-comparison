// static/js/preview.js
/**
 * Рендер превью-карточек.
 *
 * Два режима:
 *  1. Обычный — карточки с combobox (Tom Select) и кнопкой удаления.
 *  2. Из чекпоинта — статичные карточки (только просмотр),
 *     фото берётся из папки чекпоинта через stored_as.
 */

/* ---------- Инициализация Tom Select на элементе ---------- */

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
      updateLabelCounter();
      const card = selectEl.closest(".thumb-card");
      if (card) {
        card.classList.toggle("has-label", !!value);
        card.classList.toggle("no-label", !value);
      }
    },
  });
}

/* ---------- Основная функция рендера ---------- */

function renderPreview() {
  const container = document.getElementById("preview");
  if (!container) return;

  // Режим чекпоинта — статичные карточки
  if (state.lastCheckpointFile) {
    _renderCheckpointPreview(container);
    return;
  }

  // Обычный режим
  const files = state.selectedFiles;

  if (!files.length) {
    container.innerHTML = "";
    return;
  }

  const nWithLabels = stateApi.getNWithLabels();

  const header = `
    <div class="preview-panel-label">
      <span>Загружено изображений: <span class="preview-count">${files.length}</span></span>
      <span>С метками: <span class="preview-count">${nWithLabels} / ${files.length}</span></span>
    </div>
  `;

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

  container.innerHTML = header + cardsHtml;

  files.forEach((item, i) => {
    const selectEl = document.getElementById(`label-select-${i}`);
    if (!selectEl) return;
    initCombobox(selectEl, item.label, i);
  });

  updateLabelCounter();
}

/* ---------- Режим чекпоинта ---------- */

function _renderCheckpointPreview(container) {
  const data = state.lastResult;
  if (!data || !data.images || !data.images.length) {
    container.innerHTML = "";
    return;
  }

  const labels = data.labels || {};
  const nWithLabels = Object.keys(labels).length;
  const checkpointFilename = state.lastCheckpointFile;

  let html = `
    <div class="preview-panel-label">
      <span>Восстановлено из чекпоинта: <span class="preview-count">${data.images.length}</span></span>
      <span>С метками: <span class="preview-count">${nWithLabels} / ${data.images.length}</span></span>
    </div>
    <div class="preview-grid">
  `;

  data.images.forEach((img) => {
    const label = labels[img.filename] || "";
    const hasLabel = label ? "has-label" : "no-label";

    // Ссылка на фото: приоритет — stored_as, затем test_images, затем заглушка
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

/* ---------- Обработчики ---------- */

function removeFileAndRerender(index) {
  // В режиме чекпоинта удалять нельзя
  if (state.lastCheckpointFile) return;

  stateApi.removeFile(index);
  renderPreview();
}

/* ---------- Счётчик меток ---------- */

function updateLabelCounter() {
  const files = state.selectedFiles;
  if (!files.length) return;
  const n = stateApi.getNWithLabels();
  const el = document.querySelector(".preview-panel-label .preview-count:last-child");
  if (el) el.textContent = `${n} / ${files.length}`;
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