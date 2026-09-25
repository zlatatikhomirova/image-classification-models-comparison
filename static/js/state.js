// static/js/state.js
/**
 * Глобальное состояние приложения.
 * Все модули читают/пишут через window.state.
 *
 * selectedFiles: [{file: File, label: string, previewUrl: string}]
 */

const state = {
  /** @type {{file: File, label: string, previewUrl: string}[]} */
  selectedFiles: [],

  /** @type {string[]} — все 998 классов ImageNet */
  allClasses: [],

  /** @type {string[]} — классы из test_images/labels.csv */
  usedClasses: [],

  /** @type {number} — порог уверенности 0..1 */
  threshold: 0.8,

  /** @type {Object|null} — последний результат /api/analyze */
  lastResult: null,

  /** @type {string|null} — имя JSON-файла чекпоинта, из которого восстановлен результат */
  lastCheckpointFile: null,

  /** @type {Array} — список чекпоинтов */
  checkpoints: [],

  /** @type {boolean} — идёт ли сейчас обработка */
  isProcessing: false,
};

/* ---------- Управление файлами ---------- */

const MAX_IMAGES = 50;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/webp"];

/**
 * Добавляет файлы в selectedFiles.
 * Возвращает количество добавленных.
 */
function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) continue;
    if (state.selectedFiles.length >= MAX_IMAGES) break;
    if (state.selectedFiles.some(
      (f) => f.file.name === file.name && f.file.size === file.size
    )) {
      continue; // дубликат
    }

    state.selectedFiles.push({
      file,
      label: "",
      previewUrl: URL.createObjectURL(file),
    });
    added++;
  }
  return added;
}

/**
 * Заменяет весь список файлов.
 */
function setFiles(files) {
  clearFiles();
  return addFiles(files);
}

/**
 * Удаляет файл по индексу.
 */
function removeFile(index) {
  const item = state.selectedFiles[index];
  if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  state.selectedFiles.splice(index, 1);
}

/**
 * Очищает список файлов и освобождает blob-URL.
 */
function clearFiles() {
  for (const item of state.selectedFiles) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
  state.selectedFiles = [];
}

/**
 * Устанавливает метку для файла по индексу.
 */
function setLabel(index, label) {
  if (state.selectedFiles[index]) {
    state.selectedFiles[index].label = label || "";
  }
}

/**
 * Возвращает объект {filename: label} для отправки на сервер.
 * Включает только файлы, у которых указана метка.
 */
function getLabelsMap() {
  const map = {};
  for (const item of state.selectedFiles) {
    if (item.label) map[item.file.name] = item.label;
  }
  return map;
}

/* ---------- Хелперы ---------- */

function getFiles() {
  return state.selectedFiles.map((f) => f.file);
}

function getNWithLabels() {
  return state.selectedFiles.filter((f) => f.label).length;
}

function isEmpty() {
  return state.selectedFiles.length === 0;
}

window.state = state;
window.stateApi = {
  addFiles,
  setFiles,
  removeFile,
  clearFiles,
  setLabel,
  getLabelsMap,
  getFiles,
  getNWithLabels,
  isEmpty,
  MAX_IMAGES,
};