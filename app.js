const root = document.getElementById("form-root");
let current = 0;
let answers = {};
let selectedGroup = null; // grupo de preguntas elegido

function render() {
  root.innerHTML = "";

  // Progreso
  const progressWrap = document.createElement("div");
  progressWrap.className = "progress";
  const bar = document.createElement("div");
  bar.style.width = ((current) / QUESTIONS.length * 100) + "%";
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

  // Botones de opciones
  if (q.options && q.options.length) {
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(q, opt));
      content.appendChild(btn);
    });
  } else {
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

  // Botón atrás
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
      QUESTIONS.forEach(q => {
        record[q.label] = answers[q.id] || "";
      });
      await saveRecord(record);
      alert("✅ Registro guardado localmente");
      resetForm();
    });
    nav.appendChild(finish);
  }

  step.appendChild(nav);
  root.appendChild(step);
}

function handleAnswer(q, value) {
  answers[q.id] = value;
  console.log("Respuesta:", q.id, value);

  if (q.id === "q1") {
    selectedGroup = value.toLowerCase();
    console.log("Seleccionado grupo:", selectedGroup);
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
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(e => console.log(e));
  }
});
