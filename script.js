// Penales 2D — Versión con pantalla de inicio, racha y GAME OVER

// Cada portero tiene distinta probabilidad de adivinar tu tiro
const keepers = [
  { name: "Novato",     guessProb: 0.30, jersey:"#16a34a", gloves:"#22c55e", shorts:"#14532d", style:"balanced", voice:"hey" },
  { name: "Intermedio", guessProb: 0.45, jersey:"#1d4ed8", gloves:"#3b82f6", shorts:"#1e3a8a", style:"low",      voice:"vamos" },
  { name: "Ágil",       guessProb: 0.55, jersey:"#ca8a04", gloves:"#f59e0b", shorts:"#b45309", style:"high",     voice:"aqui" },
  { name: "Experto",    guessProb: 0.70, jersey:"#dc2626", gloves:"#ef4444", shorts:"#7f1d1d", style:"left",     voice:"nada" },
  { name: "Legendario", guessProb: 0.85, jersey:"#7c3aed", gloves:"#8b5cf6", shorts:"#5b21b6", style:"right",    voice:"mio" },
];

// Preguntas para el quiz
const questions = [
  { q: "¿Cuánto es 2 + 2?", opts: ["3", "4", "5", "22"], ans: 1 },
  { q: "Capital de México:", opts: ["CDMX", "Monterrey", "GDL", "Puebla"], ans: 0 },
  { q: "¿Cuántos días tiene una semana?", opts: ["5", "7", "10", "9"], ans: 1 },
  { q: "¿El agua hierve a ~¿cuántos °C?", opts: ["0", "50", "100", "200"], ans: 2 },
  { q: "¿Qué animal dice 'miau'?", opts: ["Perro", "Gato", "Pato", "Vaca"], ans: 1 },
  { q: "¿Qué planeta es rojo?", opts: ["Venus", "Marte", "Júpiter", "Mercurio"], ans: 1 },
  { q: "¿Cuánto es 10 ÷ 2?", opts: ["2", "3", "4", "5"], ans: 3 },
  { q: "¿Cuál es la moneda de México?", opts: ["Euro", "Dólar", "Peso", "Real"], ans: 2 },
  { q: "¿Qué gas abunda en el aire?", opts: ["Oxígeno", "Nitrógeno", "CO₂", "Helio"], ans: 1 },
  { q: "¿Cuántos lados tiene un triángulo?", opts: ["3", "4", "5", "6"], ans: 0 },
];

let keeperIdx = 0;
let shotInKeeper = 0;
let totalGoals = 0;
let quizScore = 0;
let usedQuestions = new Set();

// NUEVO: goles por portero y racha
let goalsThisKeeper = 0;
let streakGoals = 0;
let fastShotActive = false;

let selectedZone = null;
let powerLocked = null; // 0..1
let spinLocked = null;  // -1..1
let powerOscDir = 1;
let spinOscDir = 1;
let powerInterval = null;
let spinInterval = null;

// DOM
const startScreen = document.getElementById("startScreen");
const btnStart     = document.getElementById("btnStart");

const elKeeperName = document.getElementById("keeperName");
const elKeeperDiff = document.getElementById("keeperDiff");
const elKeeperIdx  = document.getElementById("keeperIdx");
const elShotNum    = document.getElementById("shotNum");
const elGoals      = document.getElementById("goals");
const elQuizScore  = document.getElementById("quizScore");
const elMsg        = document.getElementById("message");
const elStreak     = document.getElementById("streakCount");
const elSkill      = document.getElementById("skillStatus");

const zonesWrap = document.getElementById("zones");
const zoneButtons = zonesWrap.querySelectorAll(".zone");
const gk = document.getElementById("gk");
const ball = document.getElementById("ball");
const btnNextKeeper = document.getElementById("btnNextKeeper");
const btnRestart = document.getElementById("btnRestart");

const powerFill = document.getElementById("powerFill");
const spinFill  = document.getElementById("spinFill");
const lockPower = document.getElementById("lockPower");
const lockSpin  = document.getElementById("lockSpin");
const shootBtn  = document.getElementById("shootBtn");
const powerVal  = document.getElementById("powerVal");
const spinVal   = document.getElementById("spinVal");

const quizModal    = document.getElementById("quizModal");
const quizQ        = document.getElementById("quizQuestion");
const quizOpts     = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const quizClose    = document.getElementById("quizClose");

const finalModal   = document.getElementById("finalModal");
const finalSummary = document.getElementById("finalSummary");
const btnPlayAgain = document.getElementById("btnPlayAgain");

// GAME OVER
const gameOverModal = document.getElementById("gameOverModal");
const gameOverText  = document.getElementById("gameOverText");
const btnRestartGO  = document.getElementById("btnRestartGameOver");

let audioCtx = null;
let crowdGain, sfxGain;

// AUDIO -----------------------------------------------------
function ensureAudio(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioCtx.createGain();
  master.gain.value = 0.6;
  master.connect(audioCtx.destination);

  crowdGain = audioCtx.createGain();
  crowdGain.gain.value = 0.12;
  crowdGain.connect(master);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(master);

  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i=0;i<bufferSize;i++){ output[i] = (Math.random()*2-1)*0.3; }
  const white = audioCtx.createBufferSource();
  white.buffer = noiseBuffer; white.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass"; filter.frequency.value = 800;
  white.connect(filter).connect(crowdGain);
  white.start();
}

function cheer(){
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(330, now + 0.35);
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain).connect(sfxGain);
  osc.start(); osc.stop(now + 0.55);
  crowdGain.gain.cancelScheduledValues(now);
  crowdGain.gain.linearRampToValueAtTime(0.28, now + 0.25);
  crowdGain.gain.exponentialRampToValueAtTime(0.12, now + 1.2);
}

function boo(){
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc.connect(gain).connect(sfxGain);
  osc.start(); osc.stop(now + 0.65);
  crowdGain.gain.cancelScheduledValues(now);
  crowdGain.gain.linearRampToValueAtTime(0.08, now + 0.2);
  crowdGain.gain.exponentialRampToValueAtTime(0.12, now + 1.0);
}

function kickSfx(){
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(sfxGain);
  osc.start(); osc.stop(now + 0.22);
}

// ESCENARIO --------------------------------------------------
function makeCrowd(){
  const stands = document.getElementById("stands");
  stands.innerHTML = "";
  const width = stands.clientWidth;
  const height = stands.clientHeight;
  const cols = Math.max(20, Math.floor(width / 16));
  const rows = Math.max(6, Math.floor(height / 16));
  const total = cols * rows;
  for (let i=0;i<total;i++){
    const d = document.createElement("div");
    d.className = "spectator";
    const x = (i % cols) * (width/cols) + (Math.random()*6 - 3);
    const y = Math.floor(i / cols) * (height/rows) + (Math.random()*4 - 2);
    d.style.left = `${x}px`;
    d.style.top  = `${y}px`;
    const hue = Math.floor(Math.random()*360);
    d.style.background = `hsl(${hue} 70% 55%)`;
    if (Math.random() < 0.2) d.classList.add("wave");
    stands.appendChild(d);
  }
}

function makeAds(){
  const strip = document.getElementById("adStrip");
  strip.innerHTML = "";
  const sponsors = [
    "Café Titanex","UT Santa Catarina","Chubb","Deportiva Norte",
    "Balón MX","Aseguradora Atlas","Farmacia Salud","Refrescos Polo",
    "Banco Firme","GIGATECH"
  ];
  sponsors.forEach((name)=>{
    const d = document.createElement("div");
    d.className = "ad-chip";
    d.textContent = name;
    strip.appendChild(d);
  });
}

// Portero SVG detallado --------------------------------------
function buildKeeperSVG(k){
  return `
    <svg viewBox="0 0 160 200">
      <ellipse cx="80" cy="190" rx="38" ry="10" fill="rgba(0,0,0,.45)"/>
      <circle cx="80" cy="40" r="22" fill="#ffd6a5" stroke="#e3b77b" stroke-width="2"/>
      <path d="M60 26 Q80 10 102 24 Q100 12 94 10 Q86 8 76 10 Q66 12 60 20 Z"
            fill="#111827"/>
      <circle cx="71" cy="40" r="3" fill="#111"/>
      <circle cx="89" cy="40" r="3" fill="#111"/>
      <path d="M69 36 Q71 34 73 36" stroke="#111" stroke-width="1" fill="none"/>
      <path d="M87 36 Q89 34 91 36" stroke="#111" stroke-width="1" fill="none"/>
      <path d="M72 48 Q80 54 88 48" stroke="#dc2626" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="73" y="58" width="14" height="10" rx="3" fill="#ffd6a5"/>
      <rect x="48" y="66" width="64" height="50" rx="14" fill="${k.jersey}" stroke="#020617" stroke-width="1.2"/>
      <rect x="48" y="80" width="64" height="10" fill="rgba(255,255,255,.18)"/>
      <rect x="76" y="66" width="4" height="50" fill="#facc15"/>
      <path d="M102 72 L112 72 L114 82 Q108 88 102 82 Z"
            fill="#e5e7eb" stroke="#cbd5e1" stroke-width="1"/>
      <rect x="22" y="72" width="30" height="16" rx="8" fill="${k.jersey}"/>
      <rect x="108" y="72" width="30" height="16" rx="8" fill="${k.jersey}"/>
      <circle cx="24" cy="80" r="9" fill="${k.gloves}" stroke="#020617" stroke-width="1.5"/>
      <circle cx="136" cy="80" r="9" fill="${k.gloves}" stroke="#020617" stroke-width="1.5"/>
      <rect x="20" y="86" width="8" height="4" rx="2" fill="#0f172a"/>
      <rect x="132" y="86" width="8" height="4" rx="2" fill="#0f172a"/>
      <rect x="58" y="116" width="44" height="30" rx="10" fill="${k.shorts}" stroke="#020617" stroke-width="1.2"/>
      <rect x="58" y="116" width="4"  height="30" fill="#e5e7eb" opacity=".6"/>
      <rect x="98" y="116" width="4"  height="30" fill="#e5e7eb" opacity=".6"/>
      <rect x="60" y="146" width="14" height="32" rx="6" fill="#fed7aa"/>
      <rect x="86" y="146" width="14" height="32" rx="6" fill="#fed7aa"/>
      <rect x="60" y="162" width="14" height="20" rx="4" fill="#facc15"/>
      <rect x="86" y="162" width="14" height="20" rx="4" fill="#facc15"/>
      <path d="M60 170 H74" stroke="#111827" stroke-width="3"/>
      <path d="M86 170 H100" stroke="#111827" stroke-width="3"/>
      <rect x="56" y="180" width="20" height="8" rx="3" fill="#0f172a"/>
      <rect x="84" y="180" width="20" height="8" rx="3" fill="#0f172a"/>
    </svg>
  `;
}

// UTIL --------------------------------------------------------
function zoneCenter(zoneIndex, rect){
  const row = Math.floor(zoneIndex / 3);
  const col = zoneIndex % 3;
  const cellW = rect.width / 3;
  const cellH = rect.height / 3;
  return {
    x: rect.left + col*cellW + cellW/2,
    y: rect.top + row*cellH + cellH/2
  };
}

function centerGk(){ moveGkToZone(4, null); }

function moveGkToZone(zoneIndex, style){
  const rect = zonesWrap.getBoundingClientRect();
  const pos = zoneCenter(zoneIndex, rect);
  const leftPerc = ((pos.x - rect.left) / rect.width) * 100;
  const topPerc  = ((pos.y - rect.top) / rect.height) * 100;
  gk.style.left = `calc(${leftPerc}% + 0px)`;
  gk.style.top  = `calc(${topPerc}% + 0px)`;
  gk.classList.remove("dive-left","dive-right","dive-high");
  if (style === "dive-left") gk.classList.add("dive-left");
  else if (style === "dive-right") gk.classList.add("dive-right");
  else if (style === "dive-high") gk.classList.add("dive-high");
}

// MEDIDORES ---------------------------------------------------
function startPowerMeter(){
  stopPowerMeter();
  let val = 0; powerOscDir = 1;
  powerInterval = setInterval(()=>{
    val += powerOscDir * 0.05;
    if (val >= 1){ val = 1; powerOscDir = -1; }
    if (val <= 0){ val = 0; powerOscDir = 1; }
    powerFill.style.width = (val*100).toFixed(0)+"%";
    powerVal.textContent = (val*100|0);
  }, 28);
}

function stopPowerMeter(lock=false){
  if (powerInterval){ clearInterval(powerInterval); powerInterval = null; }
  if (lock){
    const w = parseInt(powerFill.style.width||"0",10) / 100;
    powerLocked = Math.max(0.1, w);
  }
}

function startSpinMeter(){
  stopSpinMeter();
  let val = -1; spinOscDir = 1;
  spinInterval = setInterval(()=>{
    val += spinOscDir * 0.09;
    if (val >= 1){ val = 1; spinOscDir = -1; }
    if (val <= -1){ val = -1; spinOscDir = 1; }
    const norm = (val+1)/2;
    spinFill.style.width = (norm*100).toFixed(0)+"%";
    spinVal.textContent = ((val*100)|0);
  }, 28);
}

function stopSpinMeter(lock=false){
  if (spinInterval){ clearInterval(spinInterval); spinInterval = null; }
  if (lock){
    const w = parseInt(spinFill.style.width||"0",10) / 100;
    spinLocked = (w*2)-1;
  }
}

// DISPARO -----------------------------------------------------
function shootToZone(zoneIndex){
  ensureAudio();
  kickSfx();

  const rect = zonesWrap.getBoundingClientRect();
  const pos = zoneCenter(zoneIndex, rect);

  const ballRect = ball.getBoundingClientRect();
  const startX = ballRect.left + ballRect.width/2;
  const startY = ballRect.top + ballRect.height/2;

  const endX = pos.x;
  const endY = pos.y;

  const dist = Math.hypot(endX - startX, endY - startY);

  let duration = Math.max(250, 700 - (powerLocked||0.3)*400);
  if (fastShotActive) {
    duration *= 0.6; // habilidad: disparo más rápido
  }

  const ctrlX = (startX + endX)/2 + (spinLocked||0)* (dist*0.25);
  const ctrlY = (startY + endY)/2 - Math.min(120, 40 + (powerLocked||0.3)*120);

  const startTime = performance.now();

  function animate(now){
    const t = Math.min(1, (now - startTime) / duration);
    const x = (1-t)*(1-t)*startX + 2*(1-t)*t*ctrlX + t*t*endX;
    const y = (1-t)*(1-t)*startY + 2*(1-t)*t*ctrlY + t*t*endY;
    ball.style.left = x + "px";
    const bottomPx = window.innerHeight - y;
    ball.style.bottom = bottomPx + "px";
    if (t < 1) requestAnimationFrame(animate);
    else { setTimeout(()=>{ resetBall(); }, 200); }
  }
  requestAnimationFrame(animate);
}

// ESTADO/JUEGO ------------------------------------------------
function setupKeeper(){
  const k = keepers[keeperIdx];
  elKeeperName.textContent = k.name;
  elKeeperDiff.textContent = `(${Math.round(k.guessProb*100)}% adivina)`;
  elKeeperIdx.textContent = (keeperIdx + 1).toString();
  elShotNum.textContent = "0";
  shotInKeeper = 0;
  goalsThisKeeper = 0;
  btnNextKeeper.disabled = true;
  elMsg.innerHTML = "Haz clic en el arco para <b>apuntar</b>. Luego bloquea <b>Potencia</b> y <b>Efecto</b> y presiona <b>Disparar</b>.<br>Necesitas <b>3 goles en 5 tiros</b> para avanzar.";
  centerGk();
  resetBall();
  buildKeeper();
  clearMeters();
  resetStreak();
}

function clearMeters(){
  stopPowerMeter(); stopSpinMeter();
  powerFill.style.width = "0%"; spinFill.style.width = "0%";
  powerVal.textContent = "—"; spinVal.textContent = "—";
  powerLocked = null; spinLocked = null; selectedZone = null;
  shootBtn.disabled = true;
}

function buildKeeper(){
  const k = keepers[keeperIdx];
  gk.innerHTML = buildKeeperSVG(k);
}

function resetBall(){ ball.style.left = "50%"; ball.style.bottom = "6vh"; }

function resetStreak(){
  streakGoals = 0;
  fastShotActive = false;
  elStreak.textContent = "0";
  elSkill.textContent = "OFF";
}

// GAME OVER ---------------------------------------------------
function showGameOver(reason){
  gameOverText.textContent = reason || "GAME OVER";
  gameOverModal.classList.remove("hidden");
}

// CONTROLES ---------------------------------------------------
function bindUI(){
  zoneButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      ensureAudio();
      if (selectedZone === null){
        selectedZone = parseInt(btn.dataset.zone, 10);
        elMsg.textContent = "Bloquea Potencia, luego Efecto y presiona Disparar.";
        startPowerMeter();
      }
    });
  });

  lockPower.addEventListener("click", () => {
    if (selectedZone===null || powerLocked!==null) return;
    stopPowerMeter(true);
    startSpinMeter();
  });

  lockSpin.addEventListener("click", () => {
    if (selectedZone===null || powerLocked===null || spinLocked!==null) return;
    stopSpinMeter(true);
    shootBtn.disabled = false;
  });

  shootBtn.addEventListener("click", () => {
    if (selectedZone===null || powerLocked===null || spinLocked===null) return;
    handleShot(selectedZone);
  });

  window.addEventListener("keydown", (e)=>{
    if (e.code === "Space" || e.code === "Enter"){
      ensureAudio();
      if (selectedZone !== null && powerLocked === null){
        stopPowerMeter(true); startSpinMeter();
      } else if (selectedZone !== null && powerLocked !== null && spinLocked === null){
        stopSpinMeter(true); shootBtn.disabled = false;
      } else if (!shootBtn.disabled){
        handleShot(selectedZone);
      }
    }
  });

  btnNextKeeper.addEventListener("click", nextKeeper);
  btnRestart.addEventListener("click", restartGame);
  quizClose.addEventListener("click", () => {
    quizModal.classList.add("hidden");
    quizClose.disabled = true;
  });
  btnPlayAgain.addEventListener("click", () => {
    finalModal.classList.add("hidden");
    restartGame();
  });
  btnRestartGO.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    restartGame();
  });

  window.addEventListener("resize", ()=>{
    makeCrowd();
    centerGk();
    makeAds();
  });

  // Pantalla de inicio
  btnStart.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    ensureAudio();
    makeCrowd();
    makeAds();
    restartGame();
  });
}

// DISPARO / LÓGICA ---------------------------------------------
function handleShot(zoneIndex){
  const k = keepers[keeperIdx];

  let gkZone;
  if (Math.random() < k.guessProb){
    gkZone = zoneIndex;
  } else {
    const others = [...Array(9).keys()].filter(z => z !== zoneIndex);
    gkZone = others[Math.floor(Math.random() * others.length)];
  }

  let diveStyle = "balanced";
  if (k.style === "left") diveStyle = "dive-left";
  else if (k.style === "right") diveStyle = "dive-right";
  else if (k.style === "high") diveStyle = "dive-high";
  else {
    const col = zoneIndex % 3;
    diveStyle = (col===0) ? "dive-left" : (col===2 ? "dive-right" : "dive-high");
  }
  moveGkToZone(gkZone, diveStyle);

  shootToZone(zoneIndex);

  const isSave = (gkZone === zoneIndex);
  setTimeout(() => {
    if (isSave){
      elMsg.textContent = "¡Atajada! Responde la pregunta para continuar. (Si fallas, GAME OVER)";
      boo();
      resetStreak();
      showQuiz();
    } else {
      elMsg.textContent = "¡Golazo!";
      cheer();
      totalGoals++;
      goalsThisKeeper++;
      elGoals.textContent = totalGoals.toString();

      // actualizar racha / habilidad
      streakGoals++;
      elStreak.textContent = streakGoals.toString();
      fastShotActive = streakGoals >= 3;
      elSkill.textContent = fastShotActive ? "ON ⚡" : "OFF";
      if (streakGoals === 3){
        elMsg.textContent += " ¡Habilidad activada! El balón va más rápido.";
      }
    }
  }, 420);

  shotInKeeper++;
  elShotNum.textContent = shotInKeeper.toString();

  // reset controles
  selectedZone = null; powerLocked = null; spinLocked = null;
  powerFill.style.width="0%"; spinFill.style.width="0%";
  powerVal.textContent="—"; spinVal.textContent="—";
  shootBtn.disabled = true;

  // Fin de los 5 tiros de este portero
  if (shotInKeeper >= 5){
    setTimeout(() => {
      if (goalsThisKeeper >= 3){
        if (keeperIdx < keepers.length - 1){
          btnNextKeeper.disabled = false;
          elMsg.textContent = `¡Superaste al portero ${keepers[keeperIdx].name} con ${goalsThisKeeper} goles! Pulsa "Siguiente Portero".`;
        } else {
          showFinal();
        }
      } else {
        showGameOver(`No lograste 3 goles con el portero ${keepers[keeperIdx].name}. GAME OVER.`);
      }
    }, 650);
  }
}

function nextKeeper(){
  if (keeperIdx < keepers.length - 1){
    keeperIdx++;
    setupKeeper();
  }
}

function restartGame(){
  keeperIdx = 0;
  shotInKeeper = 0;
  totalGoals = 0;
  quizScore = 0;
  goalsThisKeeper = 0;
  usedQuestions.clear();
  elGoals.textContent = "0";
  elQuizScore.textContent = "0";
  resetStreak();
  setupKeeper();
}

function showFinal(){
  const totalShots = keepers.length * 5;
  finalSummary.textContent = `Marcador: ${totalGoals} goles de ${totalShots} tiros · Aciertos Quiz: ${quizScore}`;
  finalModal.classList.remove("hidden");
}

function showQuiz(){
  let idx = pickUnusedQuestionIndex();
  const item = questions[idx];
  quizQ.textContent = item.q;
  quizFeedback.textContent = "";
  quizClose.disabled = true;
  quizOpts.innerHTML = "";
  item.opts.forEach((txt, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.textContent = txt;
    b.addEventListener("click", () => {
      Array.from(quizOpts.children).forEach(x => x.disabled = true);
      if (i === item.ans){
        b.classList.add("correct");
        quizFeedback.textContent = "¡Correcto!";
        quizScore++;
        elQuizScore.textContent = quizScore.toString();
        quizClose.disabled = false;
      } else {
        b.classList.add("wrong");
        quizOpts.children[item.ans].classList.add("correct");
        quizFeedback.textContent = "Incorrecto. GAME OVER";
        setTimeout(() => {
          quizModal.classList.add("hidden");
          showGameOver("Fallaste la pregunta del quiz. GAME OVER.");
        }, 900);
      }
    });
    quizOpts.appendChild(b);
  });
  quizModal.classList.remove("hidden");
}

function pickUnusedQuestionIndex(){
  if (usedQuestions.size >= questions.length){ usedQuestions.clear(); }
  let tries = 0;
  while (tries < 500){
    const idx = Math.floor(Math.random() * questions.length);
    if (!usedQuestions.has(idx)){
      usedQuestions.add(idx);
      return idx;
    }
    tries++;
  }
  return 0;
}

// INIT --------------------------------------------------------
bindUI();
// El juego inicia cuando das clic en "Jugar" (pantalla de inicio)
