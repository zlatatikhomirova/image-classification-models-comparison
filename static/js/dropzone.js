// static/js/dropzone.js
/**
 * Drag-and-drop зона загрузки.
 * Обрабатывает выбор файлов, drag-over/drop, очистку.
 */

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

/* ---------- Инициализация (вызывается из main.js) ---------- */

function initDropzone() {
  if (!dropZone || !fileInput) return;

  // Клик по зоне → открыть системный диалог
  dropZone.addEventListener("click", () => fileInput.click());

  // Drag-over: подсветка
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  // Drag-leave: убираем подсветку
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  // Drop: добавляем файлы
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  // Выбор через диалог
  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
    fileInput.value = ""; // сброс, чтобы можно было выбрать те же файлы снова
  });

  // Поддержка drag-over на всей странице (чтобы файл не открывался в браузере)
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

  // Перерендерим превью
  if (typeof renderPreview === "function") {
    renderPreview();
  }

  const total = state.selectedFiles.length;
  const max = stateApi.MAX_IMAGES;
  setStatus(`Добавлено: ${added}. Всего: ${total}${total >= max ? ` (максимум ${max})` : ""}`);
}

/* ---------- Очистка ---------- */

function clearAll() {
  stateApi.clearFiles();
  state.lastResult = null;
  state.lastCheckpointFile = null;

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

/**
 * Подгружает N файлов из test_images/ и подтягивает их метки из labels.csv.
 * @param {number} limit — 0 = все, иначе N
 * @param {"balanced"|"random"} mode
 */
async function loadTestSet(limit = 10, mode = "balanced") {
  try {
    setStatus("Загрузка тестового набора...");

    // 1. Список файлов
    const { images } = await api.testImages();
    if (!images.length) {
      setStatus("В папке test_images/ нет изображений", "error");
      return;
    }

    // 2. Текущие метки (если есть)
    let labelsMap = {};
    try {
      const labelsData = await api.classes(); // пока не используется, оставим заглушку
    } catch (_) {}
    // Загружаем labels.csv через /api/classes? Нет, метки из labels.csv читаются из test_images.
    // Правильный эндпоинт для labels.csv — /api/classes (used). Но нам нужны
    // конкретные filename → label. Читаем через отдельный запрос к файлу.
    labelsMap = await fetchTestLabels();

    // 3. Выбор подмножества
    const chosen = _pickSubset(images, labelsMap, limit, mode);

    // 4. Загрузка файлов как File-объектов
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

    // 5. Заменяем состояние
    stateApi.setFiles(files);

    // 6. Подставляем метки из labels.csv
    state.selectedFiles.forEach((item, i) => {
      if (labelsMap[item.file.name]) {
        stateApi.setLabel(i, labelsMap[item.file.name]);
      }
    });

    // 7. Рендер
    if (typeof renderPreview === "function") {
      renderPreview();
    }
    setStatus(`Загружено ${files.length} изображений из тестового набора`);
  } catch (e) {
    setStatus("Ошибка загрузки тестового набора: " + e.message, "error");
  }
}

/**
 * Читает test_images/labels.csv через статику.
 * Возвращает {filename: label}.
 */
async function fetchTestLabels() {
  try {
    const res = await fetch("/test_images/labels.csv");
    if (!res.ok) return {};
    const text = await res.text();
    const map = {};
    const lines = text.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {  // пропускаем заголовок
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

/**
 * Выбирает подмножество файлов.
 * @param {string[]} images — все файлы
 * @param {Object} labelsMap — {filename: label}
 * @param {number} limit — 0 = все
 * @param {"balanced"|"random"} mode
 */
function _pickSubset(images, labelsMap, limit, mode) {
  if (limit <= 0 || limit >= images.length) return images.slice();

  if (mode === "random") {
    const shuffled = images.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }

  // balanced: группируем по метке, берём по K из каждого класса
  const byLabel = {};
  for (const fname of images) {
    const label = labelsMap[fname];
    if (!label) continue;
    (byLabel[label] = byLabel[label] || []).push(fname);
  }

  const labels = Object.keys(byLabel);
  if (!labels.length) {
    // нет меток — просто первые N
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