// static/js/api.js
/**
 * Обёртки над fetch — единая точка для всех HTTP-запросов.
 */

const BASE = "";

async function _handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

const api = {
  /** GET /api/health */
  health: () => fetch(`${BASE}/api/health`).then(_handle),

  /** GET /api/models → {models: [...]} */
  models: () => fetch(`${BASE}/api/models`).then(_handle),

  /** GET /api/classes → {all: [...], used: [...]} */
  classes: () => fetch(`${BASE}/api/classes`).then(_handle),

  /** GET /api/test_images → {images: [...]} */
  testImages: () => fetch(`${BASE}/api/test_images`).then(_handle),

  /**
   * POST /api/analyze
   * @param {File[]} files
   */
  analyze: (files) => {
    const form = new FormData();
    for (const f of files) form.append("images", f);
    return fetch(`${BASE}/api/analyze`, {
      method: "POST",
      body: form,
    }).then(_handle);
  },

  // ============================================================
  //  UPLOADS
  // ============================================================

  /** POST /api/uploads/cleanup — удаляет все файлы из uploads/ */
  cleanupUploads: () =>
    fetch(`${BASE}/api/uploads/cleanup`, { method: "POST" }).then(_handle),

  /**
   * POST /api/uploads/delete — удаляет один файл из uploads/
   * @param {string} uploadId — UUID-имя файла
   */
  deleteUpload: (uploadId) =>
    fetch(`${BASE}/api/uploads/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId }),
    }).then(_handle),

  // ============================================================
  //  ЧЕКПОИНТЫ
  // ============================================================

  listCheckpoints: () =>
    fetch(`${BASE}/api/checkpoints`).then(_handle),

  saveCheckpoint: (payload, files) => {
    const form = new FormData();
    form.append("payload", JSON.stringify(payload));
    for (const f of files) {
      form.append("images", f);
    }
    return fetch(`${BASE}/api/checkpoints`, {
      method: "POST",
      body: form,
    }).then(_handle);
  },

  getCheckpoint: (filename) =>
    fetch(`${BASE}/api/checkpoints/${encodeURIComponent(filename)}`).then(_handle),

  deleteCheckpoint: (filename) =>
    fetch(`${BASE}/api/checkpoints/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    }).then(_handle),

  checkpointImageUrl: (filename, imageName) =>
    `${BASE}/api/checkpoints/${encodeURIComponent(filename)}/images/${encodeURIComponent(imageName)}`,
};

window.api = api;