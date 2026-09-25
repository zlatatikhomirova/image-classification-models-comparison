// static/js/main.js
/**
 * Точка входа. Вызывается после загрузки DOM.
 * Инициализирует все модули, загружает данные, вешает обработчики.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Drag-and-drop
  if (typeof initDropzone === "function") {
    initDropzone();
  }

  // 2. Ползунок порога
  _initThresholdSlider();

  // 3. Загрузка классов ImageNet
  await _loadClasses();

  // 4. Загрузка списка чекпоинтов
  if (typeof refreshCheckpoints === "function") {
    await refreshCheckpoints();
  }

  // 5. Кнопки управления
  _initButtons();

  // 6. Финальная проверка: если Tom Select не загрузился — предупреждение
  if (typeof TomSelect === "undefined") {
    console.warn("Tom Select не загружен — combobox не будет работать");
  }
});

/* ---------- Ползунок порога ---------- */

function _initThresholdSlider() {
  const input = document.getElementById("threshold");
  const label = document.getElementById("thresholdValue");
  if (!input || !label) return;

  // Устанавливаем стартовое значение
  const initial = parseFloat(input.value) || 0.8;
  state.threshold = initial;
  label.textContent = Math.round(initial * 100) + "%";

  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    state.threshold = v;
    label.textContent = Math.round(v * 100) + "%";

    // Пересчёт без запроса
    if (typeof recalcOnThreshold === "function") {
        recalcOnThreshold();
    }
    });
}

/* ---------- Загрузка классов ---------- */

async function _loadClasses() {
  try {
    const data = await api.classes();
    state.allClasses = data.all || [];
    state.usedClasses = data.used || [];
    console.log(`Классы загружены: ${state.allClasses.length} (used: ${state.usedClasses.length})`);
  } catch (e) {
    console.error("Ошибка загрузки классов:", e);
    setStatus("Не удалось загрузить список классов", "error");
  }
}

/* ---------- Кнопки управления ---------- */

function _initButtons() {
  // Кнопка "Загрузить тестовый набор" — размер уже задан в onclick
  // Кнопка "Загрузить все"
  const loadAllBtn = document.getElementById("loadAllBtn");
  if (loadAllBtn) {
    loadAllBtn.addEventListener("click", () => loadTestSet(0, "balanced"));
  }
}

/* ---------- Общий setStatus ---------- */

function setStatus(text, type = "") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text || "";
  el.className = "status" + (type ? " " + type : "");
}

window.setStatus = setStatus;