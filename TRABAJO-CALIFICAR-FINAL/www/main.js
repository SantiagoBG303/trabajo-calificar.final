// ChimbaFitness — Main logic (vanilla JS)
// Funcionalidades:
// - Lista de rutinas
// - Mostrar ejercicios
// - Temporizador por ejercicio (start/pause/next/prev)
// - Contador de repeticiones (manual)
// - Guardado del último entrenamiento en localStorage

const RUTINAS = {
  "Abdomen Destructor": {
    timePer: 40, // segundos por ejercicio por defecto
    exercises: [
      { title: "Plancha", type: "tiempo", value: 40 },
      { title: "Crunches", type: "reps", value: 25 },
      { title: "Elevación de piernas", type: "reps", value: 20 },
      { title: "Rodillas al pecho", type: "tiempo", value: 30 },
      { title: "Giros rusos", type: "reps", value: 30 }
    ]
  },

  "Piernas de Acero": {
    timePer: 40,
    exercises: [
      { title: "Sentadillas", type: "reps", value: 25 },
      { title: "Zancadas (por pierna)", type: "reps", value: 12 },
      { title: "Puente de glúteo", type: "tiempo", value: 40 },
      { title: "Saltos", type: "tiempo", value: 30 },
      { title: "Sentadilla isométrica", type: "tiempo", value: 30 }
    ]
  },

  "Full Body Power": {
    timePer: 45,
    exercises: [
      { title: "Burpees", type: "reps", value: 12 },
      { title: "Saltos de tijera", type: "tiempo", value: 40 },
      { title: "Flexiones", type: "reps", value: 15 },
      { title: "Plancha", type: "tiempo", value: 30 },
      { title: "Sentadillas", type: "reps", value: 20 }
    ]
  },

  "Cardio Intenso": {
    timePer: 30,
    exercises: [
      { title: "Saltos", type: "tiempo", value: 40 },
      { title: "Mountain climbers", type: "tiempo", value: 30 },
      { title: "Trote en el sitio", type: "tiempo", value: 60 },
      { title: "High knees", type: "tiempo", value: 30 },
      { title: "Shadow boxing", type: "tiempo", value: 45 }
    ]
  },

  "Estiramientos": {
    timePer: 45,
    exercises: [
      { title: "Cuello", type: "tiempo", value: 20 },
      { title: "Hombros", type: "tiempo", value: 30 },
      { title: "Piernas", type: "tiempo", value: 30 },
      { title: "Espalda baja", type: "tiempo", value: 25 },
      { title: "Respiración profunda", type: "tiempo", value: 40 }
    ]
  }
};

/* ---------------------------
   DOM helpers
----------------------------*/
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* DOM nodes */
const listaRutinas = $("#lista-rutinas");
const lastSessionNode = $("#last-session");
const intro = $("#intro");
const panelRutina = $("#panel-rutina");
const rutinaTitle = $("#rutina-title");
const rutinaTime = $("#rutina-time");
const rutinaCount = $("#rutina-count");
const ejerciciosList = $("#ejercicios-list");
const ejTitulo = $("#ej-titulo");
const timerNode = $("#timer");
const progressNode = $("#progress");
const btnStart = $("#btn-start");
const btnPause = $("#btn-pause");
const btnNext = $("#btn-next");
const btnPrev = $("#btn-prev");
const btnFinish = $("#btn-finish");
const repNumber = $("#rep-number");
const btnInc = $("#btn-increase");
const btnDec = $("#btn-decrease");
const bienvenida = $("#bienvenida");
const introText = $("#intro-text");

/* Estado */
let estado = {
  rutinaKey: null,
  ejercicios: [],
  currentIndex: 0,
  running: false,
  timerSeconds: 0,
  timerRemaining: 0,
  timerInterval: null,
  reps: 0
};

/* Inicializar lista de rutinas en el sidebar */
function initRutinas() {
  listaRutinas.innerHTML = "";
  Object.keys(RUTINAS).forEach((key, idx) => {
    const btn = document.createElement("button");
    btn.className = "rutina-item";
    btn.textContent = key;
    btn.onclick = () => selectRutina(key, btn);
    listaRutinas.appendChild(btn);
  });

  // último guardado
  const last = localStorage.getItem("chimba-last");
  if (last) {
    const data = JSON.parse(last);
    lastSessionNode.textContent = `${data.rutina} • ${data.date}`;
  } else {
    lastSessionNode.textContent = "Sin sesión reciente";
  }
}

/* Seleccionar rutina */
function selectRutina(key, btnEl) {
  // marcar activo
  $$(".rutina-item").forEach(n => n.classList.remove("active"));
  btnEl.classList.add("active");

  const meta = RUTINAS[key];
  estado.rutinaKey = key;
  estado.ejercicios = meta.exercises;
  estado.currentIndex = 0;
  estado.running = false;
  clearInterval(estado.timerInterval);

  // UI
  rutinaTitle.textContent = key;
  rutinaTime.textContent = `Tiempo sugerido: ${meta.timePer}s`;
  rutinaCount.textContent = `${meta.exercises.length} ejercicios`;
  renderEjercicios();
  showRutinaPanel();

  // preload primer ejercicio
  loadEjercicio(0);
}

/* Mostrar lista de ejercicios */
function renderEjercicios() {
  ejerciciosList.innerHTML = "";
  estado.ejercicios.forEach((ej, i) => {
    const li = document.createElement("li");
    li.className = "ejercicio-item";
    li.innerHTML = `
      <div class="ejercicio-left">
        <div class="bubble">${i+1}</div>
        <div class="ejercicio-info">
          <div class="ejercicio-title">${ej.title}</div>
          <div class="ejercicio-sub">${ej.type === "reps" ? `${ej.value} reps` : `${ej.value}s`}</div>
        </div>
      </div>
      <div class="ej-control">
        <button class="control" data-idx="${i}">Ir</button>
      </div>
    `;
    ejerciciosList.appendChild(li);
  });

  // eventos "Ir"
  $$(".ejercicio-item .control").forEach(b => {
    b.onclick = (ev) => {
      const idx = Number(ev.target.dataset.idx);
      goToIndex(idx);
    };
  });
}

/* Mostrar panel */
function showRutinaPanel() {
  intro.classList.add("hidden");
  panelRutina.classList.remove("hidden");
  bienvenida.textContent = estado.rutinaKey;
  introText.textContent = "Sigue el temporizador o ajusta repeticiones manualmente.";
}

/* Cargar un ejercicio por index */
function loadEjercicio(idx) {
  const ej = estado.ejercicios[idx];
  estado.currentIndex = idx;
  estado.reps = (ej.type === "reps") ? ej.value : 0;
  repNumber.textContent = estado.reps;
  ejTitulo.textContent = ej.title;
  const seconds = ej.type === "tiempo" ? ej.value : 30; // si rep, default 30s para timer opcional
  estado.timerSeconds = seconds;
  estado.timerRemaining = seconds;
  updateTimerDisplay();
  updateProgress();
  highlightActiveList();
}

/* UI: resaltar ejercicio activo */
function highlightActiveList(){
  $$(".ejercicio-item").forEach((el, i) => {
    el.style.opacity = (i === estado.currentIndex) ? "1" : "0.6";
    el.style.transform = (i === estado.currentIndex) ? "translateX(6px)" : "translateX(0)";
  });
}

/* Timer auxiliares */
function formatTime(secs){
  const mm = Math.floor(secs/60).toString().padStart(2,"0");
  const ss = (secs%60).toString().padStart(2,"0");
  return `${mm}:${ss}`;
}
function updateTimerDisplay(){
  timerNode.textContent = formatTime(estado.timerRemaining);
}
function updateProgress(){
  const total = estado.timerSeconds || 1;
  const perc = Math.max(0, Math.min(100, Math.round(((total - estado.timerRemaining)/total) * 100)));
  progressNode.value = perc;
}

/* Control de reproducción */
function startTimer(){
  if (estado.running) return;
  estado.running = true;
  btnStart.disabled = true;
  btnPause.disabled = false;

  estado.timerInterval = setInterval(() => {
    if (estado.timerRemaining > 0){
      estado.timerRemaining--;
      updateTimerDisplay();
      updateProgress();
    } else {
      // terminar ejercicio -> saltar al siguiente automáticamente
      clearInterval(estado.timerInterval);
      estado.running = false;
      btnStart.disabled = false;
      nextExercise();
    }
  }, 1000);
}

function pauseTimer(){
  if (!estado.running) return;
  clearInterval(estado.timerInterval);
  estado.running = false;
  btnStart.disabled = false;
}

function nextExercise(){
  const next = Math.min(estado.ejercicios.length - 1, estado.currentIndex + 1);
  if (next === estado.currentIndex){
    // reached end
    finishRutina();
    return;
  }
  loadEjercicio(next);
}

function prevExercise(){
  const prev = Math.max(0, estado.currentIndex - 1);
  loadEjercicio(prev);
}

function goToIndex(i){
  loadEjercicio(i);
}

/* Rep counters */
btnInc.addEventListener("click", () => {
  estado.reps = (estado.reps || 0) + 1;
  repNumber.textContent = estado.reps;
});
btnDec.addEventListener("click", () => {
  estado.reps = Math.max(0, (estado.reps || 0) - 1);
  repNumber.textContent = estado.reps;
});

/* Buttons */
btnStart.addEventListener("click", () => startTimer());
btnPause.addEventListener("click", () => pauseTimer());
btnNext.addEventListener("click", () => { pauseTimer(); nextExercise(); });
btnPrev.addEventListener("click", () => { pauseTimer(); prevExercise(); });
btnFinish.addEventListener("click", () => finishRutina());

/* Finalizar rutina */
function finishRutina(){
  pauseTimer();
  const name = estado.rutinaKey || "Sin nombre";
  const now = new Date();
  const summary = {
    rutina: name,
    date: now.toLocaleString()
  };
  localStorage.setItem("chimba-last", JSON.stringify(summary));
  lastSessionNode.textContent = `${summary.rutina} • ${summary.date}`;

  // animación y volver al intro
  panelRutina.classList.add("hidden");
  intro.classList.remove("hidden");
  bienvenida.textContent = "¡Buen trabajo!";
  introText.textContent = `Terminaste ${name}. Sesión guardada.`;
}

/* Initialize */
function setupDefaults(){
  // control inicial
  btnPause.disabled = true;

  // generar la lista de rutinas
  initRutinas();

  // si hay rutina guardada, seleccionar la primera por default
  const first = Object.keys(RUTINAS)[0];
  const firstBtn = $$(".rutina-item")[0];
  if (firstBtn) {
    selectRutina(first, firstBtn);
  }
}

/* Guardar ventana/tab close: pausar timer */
window.addEventListener("beforeunload", () => {
  pauseTimer();
});

/* Init app */
setupDefaults();
