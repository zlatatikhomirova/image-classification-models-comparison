// static/js/dropzone.js
/**
 * Drag-and-drop зона загрузки.
 */

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

/* ---------- Инициализация ---------- */

function initDropzone() {
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", (e) => {
    // Игнорируем клики по карточкам, combobox и кнопкам
    if (e.target.closest(".thumb-card")) return;
    fileInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
    fileInput.value = "";
  });

  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
}

/* ---------- Обработка файлов ---------- */

function handleFiles(fileList) {
  if (!fileList || !fileList.length) return;

  const added = stateApi.addFiles(fileList);

  if (added === 0) {
    setStatus("Файлы не добавлены: неподдерживаемый формат или дубликаты", "error");
    return;
  }

  if (typeof renderPreview === "function") {
    renderPreview();
  }

  const total = state.selectedFiles.length;
  const max = stateApi.MAX_IMAGES;
  setStatus(`Добавлено: ${added}. Всего: ${total}${total >= max ? ` (максимум ${max})` : ""}`);
}

/* ---------- Очистка ---------- */

async function clearAll() {
  stateApi.clearFiles();
  state.lastResult = null;
  state.lastCheckpointFile = null;

  // Чистим uploads/ на сервере
  try {
    await api.cleanupUploads();
  } catch (_) {}

  const preview = document.getElementById("preview");
  const results = document.getElementById("results");
  const charts = document.getElementById("charts");
  const metricsBlock = document.getElementById("metricsBlock");

  if (preview) preview.innerHTML = "";
  if (results) results.innerHTML = "";
  if (charts) charts.innerHTML = "";
  if (metricsBlock) metricsBlock.innerHTML = "";

  setStatus("");
}

/* ---------- Загрузка тестового набора ---------- */

async function loadTestSet(limit = 10, mode = "balanced") {
  try {
    setStatus("Загрузка тестового набора...");

    const { images } = await api.testImages();
    if (!images.length) {
      setStatus("В папке test_images/ нет изображений", "error");
      return;
    }

    const labelsMap = await fetchTestLabels();
    const chosen = _pickSubset(images, labelsMap, limit, mode);

    const files = [];
    for (const fname of chosen) {
      const url = `/test_images/${encodeURIComponent(fname)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = fname.split(".").pop().toLowerCase();
      const type = ext === "png" ? "image/png"
                 : ext === "bmp" ? "image/bmp"
                 : ext === "webp" ? "image/webp"
                 : "image/jpeg";
      files.push(new File([blob], fname, { type }));
    }

    stateApi.setFiles(files);

    state.selectedFiles.forEach((item, i) => {
      if (labelsMap[item.file.name]) {
        stateApi.setLabel(i, labelsMap[item.file.name]);
      }
    });

    if (typeof renderPreview === "function") {
      renderPreview();
    }
    setStatus(`Загружено ${files.length} изображений из тестового набора`);
  } catch (e) {
    setStatus("Ошибка загрузки тестового набора: " + e.message, "error");
  }
}

async function fetchTestLabels() {
  try {
    const res = await fetch("/test_images/labels.csv");
    if (!res.ok) return {};
    const text = await res.text();
    const map = {};
    const lines = text.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [fname, label] = line.split(",");
      if (fname && label) map[fname.trim()] = label.trim();
    }
    return map;
  } catch (_) {
    return {};
  }
}

function _pickSubset(images, labelsMap, limit, mode) {
  if (limit <= 0 || limit >= images.length) return images.slice();

  if (mode === "random") {
    const shuffled = images.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }

  const byLabel = {};
  for (const fname of images) {
    const label = labelsMap[fname];
    if (!label) continue;
    (byLabel[label] = byLabel[label] || []).push(fname);
  }

  const labels = Object.keys(byLabel);
  if (!labels.length) {
    return images.slice(0, limit);
  }

  const perClass = Math.max(1, Math.floor(limit / labels.length));
  const picked = [];
  for (const label of labels) {
    picked.push(...byLabel[label].slice(0, perClass));
    if (picked.length >= limit) break;
  }
  return picked.slice(0, limit);
}

/* ---------- Экспорт ---------- */

window.initDropzone = initDropzone;
window.handleFiles = handleFiles;
window.clearAll = clearAll;
window.loadTestSet = loadTestSet;