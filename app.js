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
      btn.addEventListener("click", () => handleAnswer(q, opt));
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
      handleAnswer(q, val);
    });
    content.appendChild(nextBtn);
  }

  step.appendChild(content);

  // Botones de navegación
  const nav = document.createElement("div");
  nav.className = "nav";
  const back = document.createElement("button");
  back.className = "btn secondary";
  back.type = "button";
  back.textContent = "Atrás";
  back.disabled = current === 0;
  back.addEventListener("click", () => {
    if (current > 0) current--;
    render();
  });
  nav.appendChild(back);

  // Botón finalizar si es el último paso
  if (current === QUESTIONS.length - 1) {
    const finish = document.createElement("button");
    finish.className = "btn";
    finish.type = "button";
    finish.textContent = "Finalizar y guardar";

    finish.addEventListener("click", async () => {
      const record = { fecha: new Date().toISOString() };

      // Guardar todas las respuestas
      QUESTIONS.forEach((q) => {
        record[q.label] = answers[q.id] || "";
      });

      // ✅ Clasificación por la primera pregunta (FIRST_QUESTION)
      const respuestaBase = answers[FIRST_QUESTION.id]; // por ejemplo "Planta / Esqueje"
      const uuidBase = selectedGroup; // su uuid asociado (plantOrEsqueaje, frut, etc.)

      // Cargar registros previos
      const recordsData = JSON.parse(localStorage.getItem("recordsData")) || {
        plantOrEsqueaje: [],
        frut: [],
        asesoryTec: [],
        process: [],
        providers: [],
        info: [],
      };

      // Insertar el registro en el grupo correspondiente
      if (recordsData[uuidBase]) {
        recordsData[uuidBase].push(record);
      } else {
        // Si por alguna razón no existe la clave, se crea
        recordsData[uuidBase] = [record];
      }

      // Guardar en localStorage
      localStorage.setItem("recordsData", JSON.stringify(recordsData));

      alert(`✅ Registro guardado en el grupo: ${respuestaBase}`);
      resetForm();
    });

    nav.appendChild(finish);
  }

  step.appendChild(nav);
  root.appendChild(step);
}

function handleAnswer(q, value) {
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

  nextStep();
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

window.addEventListener("load", () => {
  // ✅ Inicializar recordsData si no existe
  if (!localStorage.getItem("recordsData")) {
    const initialData = {
      plantOrEsqueaje: [],
      frut: [],
      asesoryTec: [],
      process: [],
      providers: [],
      info: [],
    };
    localStorage.setItem("recordsData", JSON.stringify(initialData));
    console.log("📦 recordsData inicializado en localStorage");
  }

  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((e) => console.log(e));
  }
});
