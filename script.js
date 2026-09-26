const canvas = document.getElementById('spores-canvas');
const ctx = canvas.getContext('2d');
let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  if(svgSel) { svgSel.attr("width", w).attr("height", h); }
});

const particleCount = window.innerWidth < 768 ? 35 : 70;
const particles = Array.from({length: particleCount}, () => ({
  x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + 0.5,
  dx: (Math.random() - 0.5) * 0.2, dy: (Math.random() - 0.5) * 0.2 - 0.1,
  alpha: Math.random() * Math.PI * 2, speed: Math.random() * 0.02 + 0.01
}));

let particlesRAF = null;
function drawParticles() {
  ctx.clearRect(0, 0, w, h);
  particles.forEach(p => {
    p.x += p.dx; p.y += p.dy; p.alpha += p.speed;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(135, 255, 71, ${(Math.sin(p.alpha) + 1) / 2 * 0.5})`;
    ctx.fill();
  });
  particlesRAF = requestAnimationFrame(drawParticles);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (particlesRAF) cancelAnimationFrame(particlesRAF);
    particlesRAF = null;
  } else if (!particlesRAF) {
    drawParticles();
  }
});
drawParticles();

let isGrown = false;
let treeReady = false;
let pendingGrowth = false;

function enterUniverse() {
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('canvas-container').classList.add('ready');
  if (treeReady) {
    if (!isGrown) { animateGrowth(); isGrown = true; }
  } else {
    pendingGrowth = true; // дерево ещё не готово — прорастим, как только будет
  }
  scheduleRareSpore();

  bgMusic.muted = musicMuted;
  bgMusic.volume = 0.35;
  bgMusic.play().catch(() => {});
  getAudioCtx();
  playNodeSound('core');
  startBgBlobs();
}

// ===== Пасхалка "Золотая спора" =====
// Список твоих лучших видео — просто добавляй сюда объекты вида
// { type: "link", url: "https://...", text: "Подпись кнопки ↗" }
const BEST_VIDEOS_NODE = {
  name: "🎬 Лучшее",
  desc: "Ты поймал спору. Вот подборка видео, которыми я горжусь(или почти).\n\nИ можно еще пол года подождать новых вкусняшек",
  media: [
    { "type": "link", "url": "https://disk.yandex.ru/i/OhCIo4NBLu6VNA", "text": "Видео №1 ↗", "caption": "FV: стоки." },
    { "type": "link", "url": "https://disk.yandex.ru/i/yu8zaFT5Z2A-Jw", "text": "Видео №2 ↗", "caption": "FV: с новым слопом." },
    { "type": "link", "url": "https://disk.yandex.ru/i/_fV1ciaLhqKz_A", "text": "Видео №3 ↗", "caption": "ROX: половина AI(и музыка)." },
    { "type": "link", "url": "https://disk.yandex.ru/i/lqvZRvWqQtVfRA", "text": "Видео №4 ↗", "caption": "ROX: ютуб выпуск(+айдентика оформление)." },
    { "type": "link", "url": "https://youtu.be/sIzHeaPwah8?si=iwMRj4YChpRsquTt", "text": "Видео №5 ↗", "caption": "MY: все мое." },
    { "type": "link", "url": "https://youtu.be/VW-rtcUZl7Y?si=S4WhSBIsRgyLuTvl", "text": "Видео №6 ↗", "caption": "MY:часть моей съемки." },
   { "type": "link", "url": "https://youtu.be/DtTc4tCs88s?si=P68yezUN0lLBdX4Q", "text": "Видео №7 ↗", "caption": "MY: собиралась из говна и палок)." },
    { "type": "link", "url": "https://youtu.be/5Fihkhz-T5Q?si=qwvhZ0wBcbYFOcmp", "text": "Видео №8 ↗", "caption": "MY: все мое." }
     
  ]
};

   const bgMusic = document.getElementById('bg-music');
let musicMuted = localStorage.getItem('musicMuted') === 'true';

function updateMusicButton() {
  document.getElementById('music-toggle').textContent = musicMuted ? '🔇' : '🔊';
}

function toggleBackgroundMusic() {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  try { localStorage.setItem('musicMuted', musicMuted); } catch (_) {}
  updateMusicButton();
  if (!musicMuted && bgMusic.paused) bgMusic.play().catch(() => {});
}

updateMusicButton();

   // ===== Синтезированные звуки при клике по узлам =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playNodeSound(kind) {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  let waveType, freqStart, freqEnd, duration, peakGain;
  if (kind === 'core') {
    waveType = 'sine'; freqStart = 180; freqEnd = 90; duration = 0.5; peakGain = 0.25;
  } else if (kind === 'main') {
    waveType = 'triangle'; freqStart = 420; freqEnd = 260; duration = 0.28; peakGain = 0.18;
  } else {
    waveType = 'sine'; freqStart = 720; freqEnd = 980; duration = 0.16; peakGain = 0.14;
  }

  osc.type = waveType;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}
   

 
const rareSporeEl = document.getElementById('rare-spore');
let rareSporeTimer = null;
let rareSporeVisible = false;

function scheduleRareSpore() {
  clearTimeout(rareSporeTimer);
  const delay = 15000 + Math.random() * 15000; // раз в 15-30 сек
  rareSporeTimer = setTimeout(showRareSpore, delay);
}

function showRareSpore() {
  const welcomeHidden = document.getElementById('welcome-screen').classList.contains('hidden');
  const modalOpen = document.getElementById('modal').classList.contains('active');
  const compareOpen = document.getElementById('compare-lightbox').classList.contains('active');
  if (document.hidden || !welcomeHidden || modalOpen || compareOpen) {
    scheduleRareSpore();
    return;
  }

  const margin = 50;
  const startX = margin + Math.random() * (window.innerWidth - margin * 2);
  const startY = margin + Math.random() * (window.innerHeight - margin * 2);

  const driftAngle = Math.random() * Math.PI * 2;
  const driftDist = 80 + Math.random() * 160;
  const endX = Math.max(margin, Math.min(window.innerWidth - margin, startX + Math.cos(driftAngle) * driftDist));
  const endY = Math.max(margin, Math.min(window.innerHeight - margin, startY + Math.sin(driftAngle) * driftDist));

  const lifeTime = 2400 + Math.random() * 1400;

  rareSporeEl.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';
  rareSporeEl.style.left = startX + 'px';
  rareSporeEl.style.top = startY + 'px';
  rareSporeEl.classList.add('visible');
  rareSporeVisible = true;

  void rareSporeEl.offsetWidth;

  const driftSeconds = (lifeTime / 1000).toFixed(2);
  rareSporeEl.style.transition += `, left ${driftSeconds}s linear, top ${driftSeconds}s linear`;
  rareSporeEl.style.left = endX + 'px';
  rareSporeEl.style.top = endY + 'px';

  rareSporeTimer = setTimeout(() => hideRareSpore(false), lifeTime);
}

function hideRareSpore(caught) {
  rareSporeEl.classList.remove('visible');
  rareSporeEl.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';
  rareSporeVisible = false;
  if (!caught) scheduleRareSpore();
}

function catchRareSpore(event) {
  event.stopPropagation();
  clearTimeout(rareSporeTimer);
  hideRareSpore(true);
  showModal(BEST_VIDEOS_NODE);
  // После поимки — долгая пауза, чтобы не спамить того, кто уже нашёл секрет
  rareSporeTimer = setTimeout(scheduleRareSpore, 90000 + Math.random() * 60000);
}

const widthD3 = window.innerWidth;
const heightD3 = window.innerHeight;
const svgSel = d3.select("#canvas-container").append("svg").attr("width", widthD3).attr("height", heightD3);
const defs = svgSel.append("defs");

const filter = defs.append("filter")
  .attr("id", "glow")
  .attr("x", "-20%").attr("y", "-20%")
  .attr("width", "140%").attr("height", "140%");
filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
const feMerge = filter.append("feMerge");
feMerge.append("feMergeNode").attr("in", "blur");
feMerge.append("feMergeNode").attr("in", "SourceGraphic");

const filterMobile = defs.append("filter")
  .attr("id", "glow-mobile")
  .attr("x", "-20%").attr("y", "-20%")
  .attr("width", "140%").attr("height", "140%");
filterMobile.append("feGaussianBlur").attr("stdDeviation", "1.2").attr("result", "blurMobile");
const feMergeMobile = filterMobile.append("feMerge");
feMergeMobile.append("feMergeNode").attr("in", "blurMobile");
feMergeMobile.append("feMergeNode").attr("in", "SourceGraphic");

const g = svgSel.append("g");
const zoom = d3.zoom().scaleExtent([0.15, 4]).on("zoom", (event) => { g.attr("transform", event.transform); });
svgSel.call(zoom);

// Кнопка «сбросить вид» — возвращает камеру в исходное положение,
// если случайно зазумился/укатился панорамированием далеко от дерева.
function resetView() {
  const scale = window.innerWidth < 768 ? 0.48 : 0.95;
  svgSel.transition().duration(600).ease(d3.easeCubicOut).call(
    zoom.transform,
    d3.zoomIdentity.translate(window.innerWidth / 2, window.innerHeight / 2).scale(scale)
  );
}

const initialScale = window.innerWidth < 768 ? 0.48 : 0.95;
svgSel.call(zoom.transform, d3.zoomIdentity.translate(widthD3 / 2, heightD3 / 2).scale(initialScale));

const treeLayer = g.append("g").attr("class", "tree-layer");
const lineGen = d3.line().curve(d3.curveCatmullRom.alpha(0.5));

function getStaticOrganicPath(x1, y1, x2, y2) {
  let dx = x2 - x1; let dy = y2 - y1;
  let dist = Math.hypot(dx, dy);
  if (dist === 0) return lineGen([[x1, y1], [x2, y2]]);
  let perpX = -dy / dist; let perpY = dx / dist;
  let seed = Math.sin(x1 * 12.9898 + y1 * 78.233) * 43758.5453;
  let noise = (seed - Math.floor(seed)) - 0.5;
  let bow = dist * 0.18 * noise;
  let p1x = x1 + dx * 0.3 + perpX * bow;
  let p1y = y1 + dy * 0.3 + perpY * bow;
  let p2x = x1 + dx * 0.7 - perpX * (bow * 0.8);
  let p2y = y1 + dy * 0.7 - perpY * (bow * 0.8);
  return lineGen([[x1, y1], [p1x, p1y], [p2x, p2y], [x2, y2]]);
}

// Прокачанность ветки: явное поле "level" (5-10) в data.json имеет приоритет,
// иначе считаем автоматически по числу дочерних навыков — но не ниже 5 и не выше 10.
// Чтобы вручную поднять/опустить ветку — добавь "level": 8 в её объект в data.json.
function getLevel(node) {
  const raw = node.data ? node.data.level : undefined;
  if (typeof raw === 'number' && !isNaN(raw)) {
    return Math.max(5, Math.min(10, Math.round(raw)));
  }
  const kids = node.children ? node.children.length : 0;
  return Math.max(5, Math.min(10, 4 + (kids || 1)));
}

d3.json("data.json?v=" + Date.now()).then(data => {
  const root = d3.hierarchy(data);

  root.eachBefore(d => {
    if (d.depth === 0) {
      d.x = 0; d.y = 0;
      d.cartX = 0; d.cartY = 0;
    } else if (d.depth === 1) {
      const count = d.parent.children.length;
      const i = d.parent.children.indexOf(d);
      d.x = (i / count) * 2 * Math.PI + 0.001;
      d.y = 220;
      d.cartX = Math.cos(d.x - Math.PI/2) * d.y;
      d.cartY = Math.sin(d.x - Math.PI/2) * d.y;
    } else {
      const count = d.parent.children.length;
      const i = d.parent.children.indexOf(d);
      const rootSiblingsCount = d.parent.parent.children.length;
      const availableSector = (2 * Math.PI) / rootSiblingsCount;
      const spread = availableSector * 0.85;
      d.x = count === 1 ? d.parent.x : d.parent.x - spread/2 + (i / (count - 1)) * spread;
      d.x += 0.001;
      d.y = d.parent.y + 160;
      d.cartX = Math.cos(d.x - Math.PI/2) * d.y;
      d.cartY = Math.sin(d.x - Math.PI/2) * d.y;
    }
  });

  const centerDecGroup = treeLayer.append("g").attr("class", "center-dec-container");
  const totalDec = window.innerWidth < 768 ? 20 : 36;
  for(let i=0; i < totalDec; i++) {
    let angle = (i / totalDec) * 2 * Math.PI + (Math.random() - 0.5) * 0.1;
    let len = Math.random() * 90 + 35;
    let endX = Math.cos(angle - Math.PI/2) * len;
    let endY = Math.sin(angle - Math.PI/2) * len;
    centerDecGroup.append("path")
      .attr("class", "branch dec-branch " + (i % 2 === 0 ? "center-dec-even" : "center-dec-odd"))
      .attr("d", getStaticOrganicPath(0, 0, endX, endY))
      .style("stroke-width", "1.5px");
  }

  root.children.forEach((mainNode, i) => {
    const cluster = treeLayer.append("g")
      .attr("class", `branch-cluster cluster-${i % 4}`);

    const mainLevel = getLevel(mainNode);
    const levelT = (mainLevel - 5) / 5; // 0 (ур.5) .. 1 (ур.10)
    const trunkWidth = 6 + levelT * 6;           // 6px (ур.5) .. 12px (ур.10)
    const trunkBrightness = (0.95 + levelT * 0.35).toFixed(2); // 0.95 .. 1.30

    cluster.append("path")
      .attr("class", "branch data-branch")
      .attr("d", getStaticOrganicPath(0, 0, mainNode.cartX, mainNode.cartY))
      .style("stroke-width", trunkWidth + "px")
      .style("--branch-brightness", trunkBrightness);

    for(let j=0; j < 2; j++) {
      let angle = mainNode.x + (Math.random() - 0.5) * 1.2;
      let len = Math.random() * 55 + 25;
      let endX = mainNode.cartX + Math.cos(angle - Math.PI/2) * len;
      let endY = mainNode.cartY + Math.sin(angle - Math.PI/2) * len;
      cluster.append("path")
        .attr("class", "branch dec-branch")
        .attr("d", getStaticOrganicPath(mainNode.cartX, mainNode.cartY, endX, endY))
        .style("stroke-width", "1.5px");
    }

    if (mainNode.children) {
      mainNode.children.forEach(subNode => {
        cluster.append("path")
          .attr("class", "branch data-branch")
          .attr("d", getStaticOrganicPath(mainNode.cartX, mainNode.cartY, subNode.cartX, subNode.cartY))
          .style("stroke-width", "4px");
      });
    }

    const clusterNodes = [mainNode, ...(mainNode.children || [])];
    const nodeSel = cluster.selectAll(".node")
      .data(clusterNodes).join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.cartX},${d.cartY})`)
      .style("opacity", 0);

nodeSel.append("circle")
  .attr("r", d => d.depth === 1 ? (10 + ((getLevel(d) - 5) / 5) * 6) : 7)
  .style("fill", d => d.children ? "#2ea043" : "#baf5a9")
  .on("click", (event, d) => { playNodeSound(d.children ? 'main' : 'leaf'); showModal(d.data); });

    const labelSel = nodeSel.append("text")
      .attr("dy", d => {
        if (d.cartY < -80) {
          const idx = d.parent ? d.parent.children.indexOf(d) : 0;
          return (idx % 2 === 0) ? "-24px" : "-8px";
        }
        if (d.cartY > 80) return "1.35em";
        return "0.35em";
      })
      .attr("x", d => {
        if (Math.abs(d.cartX) < 110 && d.cartY < 0) {
          const idx = d.parent ? d.parent.children.indexOf(d) : 0;
          const total = d.parent ? d.parent.children.length : 1;
          return (idx - (total - 1) / 2) * 32;
        }
        return d.cartX > 0 ? 18 : -18;
      })
      .attr("text-anchor", d => {
        if (Math.abs(d.cartX) < 110 && d.cartY < 0) return "middle";
        return d.cartX > 0 ? "start" : "end";
      })
      .style("font-size", d => d.depth === 1 ? "22px" : "16px")
      .style("fill", "#f0f5f1")
      .style("font-weight", "700");

    // Первая строка — имя ветки. Для главных веток (depth 1) добавляем
    // вторую строку с пипсами прокачанности (●●●○○...), плюс тёмную подложку
    // под них — иначе декоративные усики/линии рядом с узлом иногда проходят
    // прямо по пипсам и сливаются с точками (это и было на скриншоте).
    labelSel.each(function(d) {
      const sel = d3.select(this);
      const parentG = d3.select(this.parentNode);
      sel.append("tspan").text(d.data.name);
      if (d.depth === 1) {
        const level = getLevel(d);
        const pips = "●".repeat(level) + "○".repeat(10 - level);
        const pipsTspan = sel.append("tspan")
          .attr("class", "level-pips")
          .attr("x", sel.attr("x"))
          .attr("dy", "1.3em")
          .text(pips);

        const bbox = pipsTspan.node().getBBox();
        parentG.insert("rect", "text")
          .attr("class", "level-pips-bg")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4)
          .attr("rx", 4);
      }
    });
  });

  const coreGroup = treeLayer.append("g")
    .attr("class", "node core-node")
    .style("opacity", 0);

  const coreCircle = coreGroup.append("circle")
    .attr("class", "core-circle")
    .attr("r", 22)
    .style("fill", "#9e5c43")
   .on("click", () => { playNodeSound('core'); showModal(root.data); });

  coreCircle.append("animate")
    .attr("attributeName", "r")
    .attr("values", "21; 24.5; 21")
    .attr("dur", "2.8s")
    .attr("repeatCount", "indefinite")
    .attr("calcMode", "spline")
    .attr("keySplines", "0.4 0 0.2 1; 0.4 0 0.2 1");

  coreGroup.append("text")
    .attr("dy", "0.36em")
    .attr("text-anchor", "middle")
    .text("Я")
    .style("font-size", "26px")
    .style("fill", "#ffffff")
    .style("font-weight", "900");

  treeReady = true;
  totalNodesCount = root.descendants().length;
  updateExploreProgress();
  if (pendingGrowth) { animateGrowth(); isGrown = true; pendingGrowth = false; }
   
}).catch(err => console.error("Ошибка загрузки data.json:", err));

function animateGrowth() {
  d3.selectAll(".dec-branch")
    .style("opacity", 0)
    .transition().duration(900).ease(d3.easeCubicOut)
    .style("opacity", 0.35);

  d3.selectAll(".data-branch").each(function() {
    const length = this.getTotalLength();
    d3.select(this)
      .attr("stroke-dasharray", length)
      .attr("stroke-dashoffset", length)
      .transition().duration(1500).ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);
  });

  d3.selectAll(".node").transition().delay(800).duration(800).style("opacity", 1);
}

// ===== Прогресс исследования дерева =====
// Считаем, сколько уникальных узлов человек уже открывал (по имени),
// храним в localStorage, чтобы прогресс не терялся между визитами.
let totalNodesCount = 0;
let exploredNodes = [];
try {
  exploredNodes = JSON.parse(localStorage.getItem('exploredNodes') || '[]');
} catch (_) {}

function updateExploreProgress() {
  const badge = document.getElementById('explore-progress');
  if (!badge || !totalNodesCount) return;
  badge.textContent = `Открыто ${exploredNodes.length}/${totalNodesCount}`;
  badge.classList.add('visible');
}

function trackNodeExplored(name) {
  if (!name || exploredNodes.includes(name)) return;
  exploredNodes.push(name);
  try { localStorage.setItem('exploredNodes', JSON.stringify(exploredNodes)); } catch (_) {}
  const badge = document.getElementById('explore-progress');
  if (badge) {
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 400);
  }
  updateExploreProgress();
}

// Модальное окно с авто-сортировкой аудио по длительности
function showModal(data) {
  if (data !== BEST_VIDEOS_NODE) trackNodeExplored(data.name);
  let title = data.name || "Без названия";
  if (title.includes("ЯДРО") || title === "Я") {
    title = "Я";
  }
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-desc').innerText = data.desc || "";
  const gallery = document.getElementById('modal-gallery');
  gallery.innerHTML = "";

  if (data.media && Array.isArray(data.media)) {
    // Проверяем, есть ли аудио именно в ЭТОЙ конкретной ноде
    let audioItems = data.media.filter(item => item.type === "audio");
    let otherItems = data.media.filter(item => item.type !== "audio");

    // Показываем всё сразу, без ожидания метаданных — раньше здесь была
    // сортировка по длительности через Promise.all по ВСЕМ трекам, из-за
    // которой окно с большим числом аудио (например «Демки») подолгу
    // висело пустым. Порядок теперь как в data.json, зато открывается мгновенно.
    renderMediaElements(otherItems, gallery);
    renderAudioElementsPaginated(audioItems, gallery);
  }

  document.getElementById('modal').classList.add('active');
  document.getElementById('modal-bg').classList.add('active');
}

// ===== Автоматический хронометраж для ссылок на видео =====
// Вставь сюда свой бесплатный ключ YouTube Data API v3 (console.cloud.google.com →
// создать проект → включить "YouTube Data API v3" → Credentials → API key,
// в настройках ключа ограничь его своим доменом, чтобы им никто не пользовался).
// Пока ключ пустой — автоподстановка для YouTube просто не сработает,
// ничего не сломается, ссылки будут показываться как обычно.
const YOUTUBE_API_KEY = "";

function extractYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function formatSecondsToClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function parseISO8601Duration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const h = parseInt(match[1] || 0, 10), m = parseInt(match[2] || 0, 10), s = parseInt(match[3] || 0, 10);
  return h * 3600 + m * 60 + s;
}

async function fetchYoutubeDuration(videoId) {
  const cacheKey = `yt-dur-${videoId}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (_) {}

  if (!YOUTUBE_API_KEY) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`);
    const json = await res.json();
    const iso = json.items && json.items[0] && json.items[0].contentDetails.duration;
    if (!iso) return null;
    const formatted = formatSecondsToClock(parseISO8601Duration(iso));
    try { localStorage.setItem(cacheKey, formatted); } catch (_) {}
    return formatted;
  } catch (e) {
    console.warn("Не удалось получить хронометраж YouTube:", e);
    return null;
  }
}

// После вставки ссылок в DOM — асинхронно донасыщаем их хронометражем.
// Ссылки без известной длительности (не YouTube и без ручного "duration")
// просто останутся без пометки — это ожидаемо, не баг.
function attachLinkDurations(gallery) {
  gallery.querySelectorAll('.link-duration[data-url]').forEach(async span => {
    const videoId = extractYouTubeId(span.dataset.url);
    if (!videoId) return;
    const dur = await fetchYoutubeDuration(videoId);
    if (dur) span.textContent = ` (${dur})`;
  });
}

function renderMediaElements(items, gallery) {
  items.forEach(item => {
    if (item.type === "image") {
      gallery.innerHTML += `<img src="${item.url}" class="media-item">`;
    } else if (item.type === "video") {
      gallery.innerHTML += `<video controls src="${item.url}" class="media-item"></video>`;
    } else if (item.type === "link") {
  const durationHtml = item.duration
    ? ` <span class="link-duration">(${item.duration})</span>`
    : ` <span class="link-duration" data-url="${item.url}"></span>`;
  const topMargin = item.caption ? "6px" : "15px";
  const linkHtml = `<a href="${item.url}" target="_blank" class="media-link" style="display: block; margin-top: ${topMargin}; padding: 12px; background-color: #2ea043; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold;">${item.text || "Перейти ↗"}${durationHtml}</a>`;
  if (item.caption) {
    gallery.innerHTML += `<div class="link-caption">${item.caption}</div>${linkHtml}`;
  } else {
    gallery.innerHTML += linkHtml;
  }
} else if (item.type === "comparison" && item.pairs) {
      let compHtml = `<div class="compare-container">`;
      item.pairs.forEach(pair => {
        compHtml += `
          <div class="compare-row" onclick="openCompareSlider('${pair.before}', '${pair.after}')" title="Нажмите для интерактивного сравнения">
            <div class="compare-card">
              <img src="${pair.before}" alt="Исходник">
              <div class="compare-badge badge-before">Исходник</div>
            </div>
            <div class="compare-card">
              <img src="${pair.after}" alt="AI">
              <div class="compare-badge badge-after">AI ↔</div>
            </div>
          </div>`;
      });
      compHtml += `</div>`;
      gallery.innerHTML += compHtml;
    }
  });
  attachLinkDurations(gallery);
}

function renderAudioElement(item, gallery) {
  // Если title не задан в data.json, вытаскиваем имя файла из url
  let autoTitle = item.title;
  if (!autoTitle && item.url) {
    let cleanName = item.url.split('/').pop().split('?')[0]; // получаем "track1.mp3"
    autoTitle = cleanName.substring(0, cleanName.lastIndexOf('.')) || cleanName; // убираем ".mp3" -> "track1"
    // Делаем первую букву заглавной для красоты
    autoTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
  }

  gallery.innerHTML += `
    <div class="media-audio-container">
      <div class="media-audio-title">${autoTitle || "Аудио демо"}</div>
      <audio controls src="${item.url}"></audio>
    </div>`;
}

// Листалка для длинных списков аудио (например «Демки» с 20+ треками) —
// рендерим только текущую страницу, а не всё разом, так модалка не замирает
// на куче одновременно создаваемых <audio> элементов.
const AUDIO_PAGE_SIZE = 6;

function renderAudioElementsPaginated(items, gallery) {
  if (!items.length) return;
  const pageCount = Math.ceil(items.length / AUDIO_PAGE_SIZE);
  let currentPage = 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'audio-pager';
  gallery.appendChild(wrapper);

  function renderPage() {
    wrapper.innerHTML = "";
    const start = currentPage * AUDIO_PAGE_SIZE;
    const pageItems = items.slice(start, start + AUDIO_PAGE_SIZE);

    const list = document.createElement('div');
    pageItems.forEach(item => renderAudioElement(item, list));
    wrapper.appendChild(list);

    if (pageCount > 1) {
      const nav = document.createElement('div');
      nav.className = 'audio-pager-nav';
      nav.innerHTML = `
        <button class="pager-btn" id="pager-prev" ${currentPage === 0 ? 'disabled' : ''}>← Назад</button>
        <span class="pager-label">Стр. ${currentPage + 1} из ${pageCount}</span>
        <button class="pager-btn" id="pager-next" ${currentPage === pageCount - 1 ? 'disabled' : ''}>Дальше →</button>
      `;
      wrapper.appendChild(nav);
      nav.querySelector('#pager-prev').onclick = () => { currentPage--; renderPage(); };
      nav.querySelector('#pager-next').onclick = () => { currentPage++; renderPage(); };
    }
  }

  renderPage();
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.getElementById('modal-bg').classList.remove('active');
  document.querySelectorAll('#modal-gallery video, #modal-gallery audio').forEach(media => {
    media.pause();
  });
}

// Управление интерактивным сравнением До/После
let isSliding = false;

function openCompareSlider(beforeUrl, afterUrl) {
  const stage = document.getElementById('slider-stage');
  const imgBefore = document.getElementById('slider-img-before');
  const imgAfter = document.getElementById('slider-img-after');
  const lightbox = document.getElementById('compare-lightbox');

  if (imgBefore && imgAfter && stage && lightbox) {
    imgBefore.src = beforeUrl;
    imgAfter.src = afterUrl;
    stage.style.setProperty('--pos', '50%');
    lightbox.classList.add('active');
  }
}

function closeCompareSlider() {
  const lightbox = document.getElementById('compare-lightbox');
  if (lightbox) lightbox.classList.remove('active');
}

function setSliderPos(clientX) {
  const stage = document.getElementById('slider-stage');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  let pos = ((clientX - rect.left) / rect.width) * 100;
  pos = Math.max(0, Math.min(100, pos));
  stage.style.setProperty('--pos', `${pos}%`);
}

const sliderStage = document.getElementById('slider-stage');
if (sliderStage) {
  sliderStage.addEventListener('dragstart', (e) => e.preventDefault());

  sliderStage.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isSliding = true;
    sliderStage.setPointerCapture(e.pointerId);
    setSliderPos(e.clientX);
  });

  sliderStage.addEventListener('pointermove', (e) => {
    if (isSliding) {
      e.preventDefault();
      setSliderPos(e.clientX);
    }
  });

  sliderStage.addEventListener('pointerup', (e) => {
    isSliding = false;
    try { sliderStage.releasePointerCapture(e.pointerId); } catch (_) {}
  });

  sliderStage.addEventListener('pointercancel', () => { isSliding = false; });
}

  // Автоматическая пауза остальных треков при старте нового
document.addEventListener('play', (e) => {
  if (e.target.tagName === 'AUDIO') {
    document.querySelectorAll('audio').forEach(audio => {
      if (audio !== e.target) {
        audio.pause();
      }
    });
  }
}, true);

   // ===== Мечтательные вспышки на фоне =====
const bgBlobEls = [document.getElementById('bg-blob-1'), document.getElementById('bg-blob-2')];
const bgBlobPalettes = [
  'radial-gradient(circle, rgba(135,255,71,0.35) 0%, rgba(46,160,67,0.12) 45%, rgba(46,160,67,0) 70%)',
  'radial-gradient(circle, rgba(222,136,106,0.30) 0%, rgba(158,92,67,0.10) 45%, rgba(158,92,67,0) 70%)',
  'radial-gradient(circle, rgba(160,220,255,0.25) 0%, rgba(90,150,200,0.10) 45%, rgba(90,150,200,0) 70%)'
];

function scheduleBgBlob(el) {
  const delay = 20000 + Math.random() * 20000; // раз в 20-40 сек у каждого блоба своё расписание
  setTimeout(() => showBgBlob(el), delay);
}

function showBgBlob(el) {
  if (document.hidden) { scheduleBgBlob(el); return; }

  const isMobile = window.innerWidth < 768;
  const size = (isMobile ? 55 : 30) + Math.random() * (isMobile ? 20 : 24);
  el.style.width = size + 'vw';
  el.style.height = size + 'vw';
  el.style.background = bgBlobPalettes[Math.floor(Math.random() * bgBlobPalettes.length)];
  el.style.left = (15 + Math.random() * 70) + 'vw';
  el.style.top = (15 + Math.random() * 70) + 'vh';

  el.style.opacity = '1';
  el.style.transform = 'translate(-50%, -50%) scale(1)';

  const lifeTime = 5000 + Math.random() * 3000;
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(0.7)';
  }, lifeTime);

  scheduleBgBlob(el);
}

let blobsStarted = false;
function startBgBlobs() {
  if (blobsStarted) return;
  blobsStarted = true;
  bgBlobEls.forEach((el, i) => setTimeout(() => scheduleBgBlob(el), i * 8000));
}
  
