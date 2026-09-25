// static/js/metrics_calc.js
/**
 * Расчёт метрик качества на клиенте.
 * Вход: images (результаты инференса) + labels (истинные метки) + threshold.
 * Выход: массив объектов — по одному на модель.
 */

/**
 * @param {Array} images — [{filename, results: [{model, top, time_ms}]}]
 * @param {Object} labels — {filename: label}
 * @param {number} threshold — 0..1
 * @returns {Array<Object>} — метрики по каждой модели
 */
function calcMetrics(images, labels, threshold) {
  if (!images || !images.length) return [];
  if (!labels || !Object.keys(labels).length) return [];

  // Собираем имена моделей
  const modelNames = images[0].results.map((r) => r.model);

  // Структуры по моделям
  const yTrue = {};           // model → [true_label, ...]
  const yPred = {};           // model → [pred_label, ...]
  const conf = {};            // model → [confidence, ...]
  const time = {};            // model → [time_ms, ...]
  const overconf = {};        // model → count
  const predsByClass = {};    // model → { true_label: [pred_label, ...] }
  const nByModel = {};        // model → count

  for (const m of modelNames) {
    yTrue[m] = [];
    yPred[m] = [];
    conf[m] = [];
    time[m] = [];
    overconf[m] = 0;
    predsByClass[m] = {};
    nByModel[m] = 0;
  }

  // Проходим по всем изображениям с метками
  for (const img of images) {
    const trueLabel = labels[img.filename];
    if (!trueLabel) continue;

    for (const r of img.results) {
      const m = r.model;
      const t1 = r.top[0];
      const predLabel = t1.label;
      const c = t1.confidence / 100;  // 0..1

      yTrue[m].push(trueLabel);
      yPred[m].push(predLabel);
      conf[m].push(c);
      time[m].push(r.time_ms);
      nByModel[m] += 1;

      if (predLabel !== trueLabel && c > threshold) {
        overconf[m] += 1;
      }

      if (!predsByClass[m][trueLabel]) predsByClass[m][trueLabel] = [];
      predsByClass[m][trueLabel].push(predLabel);
    }
  }

  // Считаем метрики для каждой модели
  const rows = [];
  for (const m of modelNames) {
    const n = nByModel[m];
    if (n === 0) continue;

    // Top-1 accuracy
    let top1Correct = 0;
    for (let i = 0; i < n; i++) {
      if (yTrue[m][i] === yPred[m][i]) top1Correct++;
    }
    const top1 = (top1Correct / n) * 100;

    // Top-5 accuracy
    let top5Correct = 0;
    for (const img of images) {
      const trueLabel = labels[img.filename];
      if (!trueLabel) continue;
      for (const r of img.results) {
        if (r.model !== m) continue;
        const top5Labels = r.top.slice(0, 5).map((t) => t.label);
        if (top5Labels.includes(trueLabel)) top5Correct++;
        break;
      }
    }
    const top5 = (top5Correct / n) * 100;

    // Macro-F1
    const macroF1 = _calcMacroF1(yTrue[m], yPred[m]);

    // Внутриклассовая согласованность
    const consistency = _calcIntraClassConsistency(predsByClass[m]) * 100;

    // Средняя уверенность
    const avgConf = (conf[m].reduce((a, b) => a + b, 0) / n) * 100;

    // Доля уверенных ошибок
    const overconfRate = (overconf[m] / n) * 100;

    // Среднее время
    const avgTime = time[m].reduce((a, b) => a + b, 0) / n;

    rows.push({
      model: m,
      top1_accuracy: round2(top1),
      top5_accuracy: round2(top5),
      macro_f1: round3(macroF1),
      intra_class_consistency: round2(consistency),
      avg_confidence: round2(avgConf),
      overconfidence_rate: round2(overconfRate),
      avg_time_ms: round1(avgTime),
      n_evaluated: n,
    });
  }

  return rows;
}

/* ---------- Внутренние функции ---------- */

/**
 * Macro-F1 без sklearn.
 * F1 = 2 * P * R / (P + R). Усредняем по классам.
 */
function _calcMacroF1(yTrue, yPred) {
  const classes = [...new Set(yTrue)];
  if (!classes.length) return 0;

  let sum = 0;
  for (const cls of classes) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const t = yTrue[i];
      const p = yPred[i];
      if (t === cls && p === cls) tp++;
      else if (t !== cls && p === cls) fp++;
      else if (t === cls && p !== cls) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
    sum += f1;
  }
  return sum / classes.length;
}

/**
 * Внутриклассовая согласованность.
 * Для каждого класса — доля самого частого предсказания.
 * Усредняем по классам.
 */
function _calcIntraClassConsistency(predsByClass) {
  const consistencies = [];
  for (const cls in predsByClass) {
    const preds = predsByClass[cls];
    if (!preds.length) continue;
    const counts = {};
    for (const p of preds) counts[p] = (counts[p] || 0) + 1;
    const maxCount = Math.max(...Object.values(counts));
    consistencies.push(maxCount / preds.length);
  }
  if (!consistencies.length) return 0;
  return consistencies.reduce((a, b) => a + b, 0) / consistencies.length;
}

/* ---------- Округление ---------- */

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
function round3(v) { return Math.round(v * 1000) / 1000; }

/* ---------- Экспорт ---------- */

window.calcMetrics = calcMetrics;