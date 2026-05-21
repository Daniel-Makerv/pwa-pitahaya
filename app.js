const root = document.getElementById("form-root");
let current = 0;
let answers = {};
let selectedGroup = null; // uuid del grupo elegido

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
  step.appendChild(label);

  const content = document.createElement("div");
  content.className = "options";

  // Opciones de respuesta
  if (q.options && q.options.length) {
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      // Si la opción tiene label, úsalo (para compatibilidad)
      btn.textContent = opt.label || opt;
      btn.addEventListener("click", async () => {
        await handleAnswer(q, opt);
      });
      content.appendChild(btn);
    });
  } else {
    // Campo de texto libre
    const input = document.createElement("input");
    input.type = q.label.toLowerCase().includes("correo") ? "email" : "text";
    input.placeholder = "Escribe tu respuesta...";
    input.value = answers[q.id] || "";
    content.appendChild(input);

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.type = "button";
    nextBtn.textContent = "Siguiente";
    nextBtn.addEventListener("click", async () => {
      const val = input.value.trim();
      if (!val) return alert("Por favor completa la respuesta.");
      await handleAnswer(q, val);
    });

    content.appendChild(nextBtn);

    // 👇 Agrega este bloque para enfocar automáticamente el input
    if (q.type === "text") {
      setTimeout(() => {
        input.focus();
      }, 300);
    }
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
      render();
    });
    nav.appendChild(back);
  }

  // Botón finalizar si es el último paso
  if (selectedGroup && current === QUESTIONS.length - 1) {
    console.log(current);
    console.log(QUESTIONS);
    const finish = document.createElement("button");
    finish.className = "btn";
    finish.type = "button";
    finish.textContent = "Finalizar y guardar";

    finish.addEventListener("click", async () => {
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
      console.log(record);

      // ✅ Clasificación por la primera pregunta (FIRST_QUESTION)
      const respuestaBase = answers[FIRST_QUESTION.id]; // por ejemplo "Planta / Esqueje"
      const uuidBase = selectedGroup; // su uuid asociado (plantOrEsqueaje, frut, etc.)

      // Insertar el registro en el grupo correspondiente
      await saveRecord(uuidBase, record);
      // 👇👇 Agrega esto para registrar la sincronización
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await registration.sync.register("sync-data");
          console.log("📡 Sincronización registrada con éxito");
        } catch (err) {
          console.error("❌ No se pudo registrar la sincronización", err);
          manualSyncSetup(); // fallback automático
        }
      } else {
        console.warn(
          "SyncManager no soportado, se usará sincronización manual"
          // fallback automático
        );
        manualSyncSetup();
      }

      showFinalMessage(respuestaBase);
    });

    nav.appendChild(finish);
  }

  step.appendChild(nav);
  root.appendChild(step);
}

async function handleAnswer(q, value) {
  // Guardar respuesta
  answers[q.id] = value.label || value;
  console.log("Respuesta:", q.id, value);

  // Si es la primera pregunta (selección principal)
  if (q.id === "q1") {
    selectedGroup = value.uuid; // ahora usamos el uuid
    console.log("Seleccionado grupo (uuid):", selectedGroup);
    console.log("Preguntas del grupo:", QUESTION_GROUPS[selectedGroup]);
    QUESTIONS = [FIRST_QUESTION, ...(QUESTION_GROUPS[selectedGroup] || [])];
    current = 1;
    render();
    return;
  }

  // 👉 Si ya estamos en la ÚLTIMA pregunta, finalizar de una vez
  if (current === QUESTIONS.length - 1) {
    await finalizeForm();
    return;
  }

  // Si no es la última, continuar normal
  nextStep();
}

async function finalizeForm() {
  const record = { fecha: new Date().toISOString(), send_api: false };

  // Guardar todas las respuestas
  QUESTIONS.forEach((q) => {
    const key = q.uuid || q.id;
    record[key] = answers[q.id] || "";
  });

  // ✅ Clasificación por la primera pregunta (FIRST_QUESTION)
  const respuestaBase = answers[FIRST_QUESTION.id]; // por ejemplo "Planta / Esqueje"
  const uuidBase = selectedGroup; // su uuid asociado (plantOrEsqueaje, frut, etc.)

  // Insertar el registro en el grupo correspondiente
  // Insertar el registro en el grupo correspondiente
  await saveRecord(uuidBase, record);

  if (navigator.onLine) {
    console.log("🌐 Conexión disponible, enviando inmediatamente...");
    try {
      const token = "goro4vmm.gd3"; // tu token actual
      const response = await fetch(
        "https://admin-pitahaya.brounieapps.com/api/create/form",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uuid: uuidBase,
            data: record,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Registro enviado correctamente.");
        record.send_api = true;
        await saveRecord(uuidBase, record); // actualizar estado local
      } else {
        console.warn("⚠️ Error al enviar, se guardará localmente.");
      }
    } catch (err) {
      console.error("❌ Error en envío inmediato:", err);
    }
  } else {
    console.log("📴 Sin conexión, se guardará para envío posterior.");
  }

  // 👇 Si no hay conexión o falla, usar SyncManager para sincronizar luego
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register("sync-data");
      console.log("📡 Sincronización registrada con éxito");
    } catch (err) {
      console.error("❌ No se pudo registrar la sincronización", err);
      manualSyncSetup();
    }
  } else {
    console.warn("SyncManager no soportado, se usará sincronización manual");
    manualSyncSetup();
  }

  // Mensaje final
  showFinalMessage(respuestaBase);
}

async function nextStep() {
  current = Math.min(current + 1, QUESTIONS.length - 1);
  render();
}

function resetForm() {
  answers = {};
  current = 0;
  selectedGroup = null;
  QUESTIONS = [FIRST_QUESTION];
  render();
}

window.addEventListener("load", async () => {
  await initRecords();
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
      console.log("✅ Datos pendientes enviados");
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

  // Mostrar por 10 segundos y luego reiniciar formulario
  setTimeout(() => {
    resetForm();
    render();
  }, 5000);
}
