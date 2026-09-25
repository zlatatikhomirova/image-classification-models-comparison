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
   * @param {Object} labels — {filename: label}
   * @param {number} threshold — 0..1
   */
  analyze: (files, labels, threshold) => {
    const form = new FormData();
    for (const f of files) form.append("images", f);
    form.append("labels", JSON.stringify(labels || {}));
    return fetch(
      `${BASE}/api/analyze?threshold=${encodeURIComponent(threshold)}`,
      { method: "POST", body: form }
    ).then(_handle);
  },

  // ============================================================
  //  ЧЕКПОИНТЫ
  // ============================================================

  /** GET /api/checkpoints → {checkpoints: [...]} */
  listCheckpoints: () =>
    fetch(`${BASE}/api/checkpoints`).then(_handle),

  /**
   * POST /api/checkpoints (multipart)
   * @param {Object} payload — {name, threshold, images, metrics, labels}
   * @param {File[]} files — файлы, соответствующие img.filename
   */
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

  /** GET /api/checkpoints/{filename} */
  getCheckpoint: (filename) =>
    fetch(`${BASE}/api/checkpoints/${encodeURIComponent(filename)}`).then(_handle),

  /** DELETE /api/checkpoints/{filename} */
  deleteCheckpoint: (filename) =>
    fetch(`${BASE}/api/checkpoints/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    }).then(_handle),

  /**
   * URL фото чекпоинта (не fetch — просто ссылка для <img src="...">)
   * @param {string} filename — имя JSON-файла чекпоинта
   * @param {string} imageName — stored_as (md5-имя)
   */
  checkpointImageUrl: (filename, imageName) =>
    `${BASE}/api/checkpoints/${encodeURIComponent(filename)}/images/${encodeURIComponent(imageName)}`,
};

window.api = api;