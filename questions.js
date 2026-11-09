// --- questions.js ---
// Descarga las preguntas del admin (GET /api/questions), las guarda en el dispositivo
// y las convierte al formato que ya usa el formulario (FIRST_QUESTION / QUESTION_GROUPS).
//
// Orden de prioridad al abrir la PWA:
//   1. Con internet  -> descarga de la API y guarda copia local
//   2. Sin internet  -> usa la última copia guardada
//   3. Nunca ha tenido internet -> usa las preguntas escritas en index.html (respaldo)

const QUESTIONS_API_URL =
  "https://admin-pitahaya.brounieapps.com/api/questions";
const QUESTIONS_STORAGE_KEY = "pitahaya_questions_v1";
const QUESTIONS_FETCH_TIMEOUT = 6000; // ms: en la expo no queremos esperar de más

// De dónde salieron las preguntas actuales: "api" | "cache" | "fallback"
let QUESTIONS_SOURCE = "fallback";

// Nombre legible de cada grupo (para el Excel): { section_3: "Asesoría técnica", ... }
let GROUP_TITLES = {};

// Respaldo: las preguntas escritas a mano en index.html
const FALLBACK_QUESTIONS = {
  first: FIRST_QUESTION,
  groups: QUESTION_GROUPS,
  titles: Object.fromEntries(
    (FIRST_QUESTION.options || []).map((opt) => [opt.uuid, opt.label]),
  ),
};

function sectionKey(section) {
  return `section_${section.id}`;
}

function getGroupTitle(groupKey) {
  return (
    GROUP_TITLES[groupKey] || FALLBACK_QUESTIONS.titles[groupKey] || groupKey
  );
}

/**
 * Convierte el JSON de la API al formato del formulario.
 * Regresa null si no hay ninguna pregunta principal con preguntas.
 */
function buildQuestionSet(sections) {
  if (!Array.isArray(sections)) return null;

  // Una pregunta principal sin preguntas secundarias no se puede contestar
  const valid = sections.filter(
    (s) => Array.isArray(s.questions) && s.questions.length > 0,
  );
  if (!valid.length) return null;

  const first = {
    id: "q1",
    label: "¿Qué le interesa?",
    type: "select",
    options: valid.map((s) => ({ uuid: sectionKey(s), label: s.title })),
  };

  const groups = {};
  const titles = {};

  valid.forEach((section) => {
    const key = sectionKey(section);
    const usedKeys = new Set();
    titles[key] = section.title;

    groups[key] = [...section.questions]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((q) => {
        const str = q.type?.str || "text";
        const isMultiple = /m[uú]ltiple/i.test(q.type?.name || "");

        let options = [...(q.options || [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((o) => o.text);

        if (str === "checkbox") options = ["Sí", "No"];
        if (str === "scale") options = ["1", "2", "3", "4", "5"];

        // Columna del Excel / llave en el registro: el texto de la pregunta
        let answerKey = (q.text || "").trim() || `pregunta_${q.id}`;
        if (usedKeys.has(answerKey)) answerKey = `${answerKey} (${q.id})`;
        usedKeys.add(answerKey);

        return {
          id: `q_${q.id}`,
          label: q.text,
          uuid: answerKey,
          type: str, // text | number | checkbox | select | scale
          multiple: str === "select" && isMultiple,
          required: q.required !== false, // si la API no lo manda, se toma como obligatoria
          options,
        };
      });
  });

  return { first, groups, titles };
}

function applyQuestionSet(set, source) {
  FIRST_QUESTION = set.first;
  QUESTION_GROUPS = set.groups;
  GROUP_TITLES = set.titles || {};
  QUESTIONS = [FIRST_QUESTION];
  QUESTIONS_SOURCE = source;
  console.log(`📋 Preguntas cargadas desde: ${source}`);
}

function readCachedSections() {
  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw).sections : null;
  } catch (e) {
    console.warn("⚠️ No se pudo leer la copia local de preguntas", e);
    return null;
  }
}

/**
 * Descarga de la API. Si salen bien, guarda la copia local y regresa el set listo.
 */
async function fetchQuestionSet() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUESTIONS_FETCH_TIMEOUT);

  try {
    const response = await fetch(QUESTIONS_API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const sections = await response.json();
    const set = buildQuestionSet(sections);
    if (!set) throw new Error("La API no regresó preguntas con contenido");

    localStorage.setItem(
      QUESTIONS_STORAGE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), sections }),
    );

    return set;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Se llama una vez al abrir la PWA, antes del primer render().
 */
async function loadQuestions() {
  if (navigator.onLine) {
    try {
      applyQuestionSet(await fetchQuestionSet(), "api");
      return;
    } catch (e) {
      console.warn(
        "⚠️ No se pudieron descargar las preguntas, se usa la copia local:",
        e.message,
      );
    }
  }

  const cachedSet = buildQuestionSet(readCachedSections());
  if (cachedSet) {
    applyQuestionSet(cachedSet, "cache");
    return;
  }

  applyQuestionSet(FALLBACK_QUESTIONS, "fallback");
}

/**
 * Al volver el internet: actualiza la copia local sin interrumpir a quien está contestando.
 * Las preguntas nuevas se usan a partir del siguiente registro (ver resetForm en app.js).
 */
async function refreshQuestionsInBackground() {
  try {
    await fetchQuestionSet();
    console.log("🔄 Copia local de preguntas actualizada");
  } catch (e) {
    console.warn("⚠️ No se pudo actualizar la copia de preguntas:", e.message);
  }
}

/**
 * Usa la copia local más reciente (si existe). Se llama al reiniciar el formulario.
 */
function applyLatestCachedQuestions() {
  const cachedSet = buildQuestionSet(readCachedSections());
  if (cachedSet)
    applyQuestionSet(cachedSet, QUESTIONS_SOURCE === "api" ? "api" : "cache");
}

window.addEventListener("online", refreshQuestionsInBackground);
