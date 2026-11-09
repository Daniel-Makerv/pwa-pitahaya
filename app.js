const root = document.getElementById("form-root");
let current = 0;
let answers = {};
let selectedGroup = null; // llave del grupo elegido (section_3, plantOrEsqueaje, etc.)
let multiSelection = []; // opciones marcadas en la pregunta de selección múltiple actual

function render() {
  root.innerHTML = "";

  // Progreso
  const progressWrap = document.createElement("div");
  progressWrap.className = "progress";
  const bar = document.createElement("div");
  bar.style.width = (current / QUESTIONS.length) * 100 + "%";
  progressWrap.appendChild(bar);
  root.appendChild(progressWrap);

  const q = QUESTIONS[current];
  const step = document.createElement("div");
  step.className = "step active";

  const label = document.createElement("div");
  label.className = "question";
  label.textContent = q.label;
  if (isOptional(q)) {
    const hint = document.createElement("span");
    hint.textContent = " (opcional)";
    hint.style.opacity = "0.6";
    hint.style.fontWeight = "normal";
    label.appendChild(hint);
  }
  step.appendChild(label);

  const content = document.createElement("div");
  content.className = "options";

  if (q.options && q.options.length && q.multiple) {
    // Selección múltiple: se marcan varias y luego "Siguiente"
    renderMultipleChoice(q, content);
  } else if (q.options && q.options.length) {
    // Selección única / Sí-No / Escala / primera pregunta
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.textContent = opt.label || opt;
      btn.addEventListener("click", async () => {
        await handleAnswer(q, opt);
      });
      content.appendChild(btn);
    });

    if (isOptional(q)) content.appendChild(skipButton(q));
  } else {
    // Campo libre (texto o número)
    const input = document.createElement("input");
    input.type = getInputType(q);
    if (input.type === "number") input.inputMode = "decimal";
    input.placeholder = "Escribe tu respuesta...";
    input.value = answers[q.id] || "";
    content.appendChild(input);

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.type = "button";
    nextBtn.textContent = "Siguiente";

    const submitText = async () => {
      const val = input.value.trim();
      if (!val && !isOptional(q))
        return alert("Por favor completa la respuesta.");
      await handleAnswer(q, val);
    };

    nextBtn.addEventListener("click", submitText);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitText();
    });

    content.appendChild(nextBtn);

    setTimeout(() => input.focus(), 300);
  }

  step.appendChild(content);

  // Botones de navegación
  const nav = document.createElement("div");
  nav.className = "nav";
  if (selectedGroup && current > 0) {
    const back = document.createElement("button");
    back.className = "btn secondary";
    back.type = "button";
    back.textContent = "Atrás";
    back.addEventListener("click", () => {
      if (current > 0) current--;
      multiSelection = [];
      render();
    });
    nav.appendChild(back);
  }

  step.appendChild(nav);
  root.appendChild(step);
}

function getInputType(q) {
  if (q.type === "number") return "number";
  if ((q.label || "").toLowerCase().includes("correo")) return "email";
  return "text";
}

function renderMultipleChoice(q, content) {
  // Recuperar lo que ya había marcado si regresó con "Atrás"
  if (!multiSelection.length && answers[q.id]) {
    multiSelection = String(answers[q.id]).split(", ").filter(Boolean);
  }

  const hint = document.createElement("p");
  hint.textContent = "Puedes elegir varias opciones";
  hint.style.opacity = "0.7";
  hint.style.width = "100%";
  content.appendChild(hint);

  q.options.forEach((opt) => {
    const value = opt.label || opt;
    const btn = document.createElement("button");
    btn.className = "btn" + (multiSelection.includes(value) ? " selected" : "");
    btn.type = "button";
    btn.textContent = value;
    btn.setAttribute("aria-pressed", multiSelection.includes(value));
    btn.addEventListener("click", () => {
      multiSelection = multiSelection.includes(value)
        ? multiSelection.filter((v) => v !== value)
        : [...multiSelection, value];
      render();
    });
    content.appendChild(btn);
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn";
  nextBtn.type = "button";
  nextBtn.textContent = "Siguiente";
  nextBtn.addEventListener("click", async () => {
    if (!multiSelection.length && !isOptional(q))
      return alert("Elige al menos una opción.");
    await handleAnswer(q, multiSelection.join(", "));
  });
  content.appendChild(nextBtn);

  if (isOptional(q)) content.appendChild(skipButton(q));
}

// La primera pregunta y las preguntas de respaldo siempre son obligatorias
function isOptional(q) {
  return q.id !== "q1" && q.required === false;
}

function skipButton(q) {
  const skip = document.createElement("button");
  skip.className = "btn secondary";
  skip.type = "button";
  skip.textContent = "Omitir";
  skip.addEventListener("click", async () => {
    multiSelection = [];
    await handleAnswer(q, "");
  });
  return skip;
}

async function handleAnswer(q, value) {
  // Guardar respuesta
  answers[q.id] = value.label || value;
  multiSelection = [];
  console.log("Respuesta:", q.id, value);

  // Si es la primera pregunta (selección principal)
  if (q.id === "q1") {
    selectedGroup = value.uuid;
    const groupQuestions = QUESTION_GROUPS[selectedGroup] || [];

    if (!groupQuestions.length) {
      alert("Esta opción todavía no tiene preguntas.");
      return;
    }

    QUESTIONS = [FIRST_QUESTION, ...groupQuestions];
    current = 1;
    render();
    return;
  }

  // Si ya estamos en la ÚLTIMA pregunta, finalizar de una vez
  if (current === QUESTIONS.length - 1) {
    await finalizeForm();
    return;
  }

  nextStep();
}

let finalizing = false;

async function finalizeForm() {
  if (finalizing) return; // evita guardar dos veces con doble clic
  finalizing = true;

  try {
    const uuidBase = selectedGroup;
    const record = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      send_api: false,
    };

    // Guardar todas las respuestas
    QUESTIONS.forEach((q) => {
      const key = q.uuid || q.id;
      record[key] = answers[q.id] || "";
    });

    // 1) Siempre se guarda primero en el dispositivo
    await saveRecord(uuidBase, record);

    // 2) Si hay internet, se intenta mandar en ese momento
    if (navigator.onLine) {
      try {
        const sent = await sendRecord(uuidBase, record);
        if (sent) await markRecordSent(uuidBase, record.id);
      } catch (e) {
        console.log("📴 Falló el envío inmediato, queda pendiente.");
      }
    } else {
      console.log("📴 Sin conexión, se enviará cuando vuelva el internet.");
    }

    // 3) Lo que no se haya podido mandar queda pendiente para la sincronización
    await registerBackgroundSync();

    showFinalMessage();
  } finally {
    finalizing = false;
  }
}

async function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-data");
      console.log("📡 Sincronización registrada con éxito");
    } catch (err) {
      console.error("❌ No se pudo registrar la sincronización", err);
    }
  }
  // La sincronización manual (online + cada 30 s) siempre está activa como respaldo
  manualSyncSetup();
}

async function nextStep() {
  current = Math.min(current + 1, QUESTIONS.length - 1);
  render();
}

function resetForm() {
  answers = {};
  current = 0;
  selectedGroup = null;
  multiSelection = [];

  // Si mientras tanto se descargaron preguntas nuevas, se usan desde este registro
  applyLatestCachedQuestions();

  QUESTIONS = [FIRST_QUESTION];
  render();
}

function showLoading() {
  root.innerHTML = '<p class="loading-questions">Cargando preguntas...</p>';
}

window.addEventListener("load", async () => {
  showLoading();

  await initRecords();
  await loadQuestions();
  render();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("service-worker.js");
      console.log("✅ SW registrado");
    } catch (e) {
      console.error(e);
    }
  }

  manualSyncSetup();
});

// 🔁 Sincronización manual para navegadores sin SyncManager
async function manualSyncSetup() {
  if (window._manualSyncInitialized) return;
  window._manualSyncInitialized = true;

  console.log("⚙️ Configurando sincronización manual...");

  // Cuando vuelve internet
  window.addEventListener("online", async () => {
    console.log("📡 Internet restaurado");
    try {
      await sendPendingData();
    } catch (e) {
      console.error("❌ Error enviando pendientes", e);
    }
  });

  // Intentar sincronizar al abrir la app
  if (navigator.onLine) {
    console.log("🚀 App abierta con conexión, enviando pendientes...");
    await sendPendingData();
  }

  // Reintentar periódicamente
  setInterval(async () => {
    if (navigator.onLine) {
      await sendPendingData();
    }
  }, 30000);
}

function showFinalMessage() {
  root.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "final-message";

  const message1 = document.createElement("p");
  message1.textContent =
    "Todo cultivo florece mejor cuando se comparte el conocimiento.";

  const message2 = document.createElement("p");
  message2.textContent = "Gracias por tu confianza.";

  const link = document.createElement("a");
  link.href = "https://pitahayaorg.com";
  link.textContent = "pitahayaorg.com";
  link.target = "_blank";
  link.className = "final-link";

  wrapper.appendChild(message1);
  wrapper.appendChild(message2);
  wrapper.appendChild(link);

  root.appendChild(wrapper);

  // Mostrar 5 segundos y luego reiniciar formulario
  setTimeout(resetForm, 5000);
}
