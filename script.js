'use strict';

/* ============================================================
   UTILIDADES
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 640;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ============================================================
   DATOS Y ALMACENAMIENTO
   ============================================================ */
const STORAGE_KEY = 'bestie_bday_config_v3';

const DEFAULT_DATA = {
    name: 'ARIANA',
    startDate: '2021-04-12',
    letter: '¡Feliz Cumpleaños a mi persona favorita en el universo entero! 🌹✨\n\nGracias por estar siempre ahí en las buenas y en las malas, por ser la primera persona a la que acudo cuando necesito un consejo o reírme sin sentido durante horas.\n\nNuestra amistad es uno de los tesoros más grandes que tengo. Espero que este nuevo año de vida esté lleno de salud, amor, éxito y muchos más viajes y aventuras juntas.\n\n¡Te quiero infinito!',
    sign: 'Tu mejor amiga por siempre ❤️',
    polaroids: [
        { url: 'fotos/foto3.jpeg', caption: 'Locuraa', note: 'ENTRE LOCOS SE PASA MEJOR' },
        { url: 'fotos/foto2.jpeg', caption: 'Mi nera', note: 'CONTIGO UN DIA NORMAL SE CONVIERTE EN BUEN RECUERDO' },
        { url: 'fotos/foto5.jpeg', caption: 'amistad que vale oro ', note: ' Creo que esta demas describirlo' },
        { url: 'fotos/foto1.jpeg', caption: 'Mi Mejor Compañía', note: 'UNA AMISTAD COMO LA TUYA MAS QUE SUFICIENTE PARA MI' },
        { url: 'fotos/foto6.jpeg', caption: 'Los pinkis', note: 'LOS 3 CARE  POTO' },
        { url: 'fotos/foto7.jpeg', caption: 'raticos feliz', note: 'De esos que no se planean pero se guardan para siempre.' },

        { url: 'fotos/foto4.jpeg', caption: 'MI NERA', note: 'SIMPLEMENTE AGRADEZCO AL AVER CONOCIDO UNA PERSONA TAN MARAVILLOSA COMO TU' },
        ]
};

const Store = {
    load() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { /* sin datos */ }
        const cfg = { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), ...saved };
        if (!Array.isArray(cfg.polaroids) || !cfg.polaroids.length) {
            cfg.polaroids = JSON.parse(JSON.stringify(DEFAULT_DATA.polaroids));
        }
        return cfg;
    },
    save(cfg) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); return true; }
        catch (_) { return false; }
    }
};

let config = Store.load();

const Sound = (() => {
    let ctx = null, master = null, timer = null;
    let on = false, userChose = false, step = 0;
    const playingVideos = new Set();

    // Acordes suaves: Do, La menor, Fa, Sol (la primera nota es la fundamental)
    const CHORDS = [
        [261.63, 329.63, 392.00, 523.25],
        [220.00, 261.63, 329.63, 440.00],
        [174.61, 220.00, 261.63, 349.23],
        [196.00, 246.94, 293.66, 392.00]
    ];
    const PATTERN = [0, 1, 2, 3, 2, 1];

    function audio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0;
            master.connect(ctx.destination);
        }
        // No reanudar el contexto mientras un video está sonando
        if (ctx.state === 'suspended' && playingVideos.size === 0) ctx.resume();
        return ctx;
    }

    function tone(freq, dur = 0.2, { type = 'sine', vol = 0.06, delay = 0, attack = 0.02, music = false } = {}) {
        try {
            const c = audio();
            if (!c) return;
            const t = c.currentTime + delay;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(vol, t + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(gain).connect(music ? master : c.destination);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        } catch (_) { /* audio no disponible */ }
    }

    function playStep() {
        const chord = CHORDS[Math.floor(step / PATTERN.length) % CHORDS.length];
        const i = step % PATTERN.length;
        if (i === 0) tone(chord[0] / 2, 3.4, { vol: 0.05, attack: 0.3, music: true });   // bajo suave
        tone(chord[PATTERN[i]], 1.8, { vol: 0.035, attack: 0.08, music: true });          // arpegio
        step++;
    }

    function updateUI() {
        const label = $('#audio-label'), icon = $('#audio-icon'), btn = $('#btn-audio');
        btn.setAttribute('aria-pressed', String(on));
        label.textContent = on ? 'MÚSICA: ON' : 'MÚSICA: OFF';
        icon.className = on ? 'fa-solid fa-volume-high' : 'fa-solid fa-music';
    }

    // Decide si la música suena o no (apagada por el usuario o por un video)
    function refresh() {
        clearInterval(timer);
        timer = null;
        const shouldPlay = on && playingVideos.size === 0;

        if (shouldPlay) {
            const c = audio();
            if (!c) return;
            master.gain.cancelScheduledValues(c.currentTime);
            master.gain.setTargetAtTime(1, c.currentTime, 0.4);   // entra suave
            playStep();
            timer = setInterval(playStep, 650);
        } else if (ctx) {
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); // sale suave
            if (playingVideos.size) {
                // libera el audio del dispositivo para que el video se oiga bien
                setTimeout(() => { if (playingVideos.size && ctx) ctx.suspend(); }, 600);
            }
        }
    }

    return {
        tick: () => tone(600, 0.06),
        chime: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.4, { type: 'triangle', delay: i * 0.08 })),

        toggle() {
            userChose = true;
            on = !on;
            updateUI();
            refresh();
        },

        // Arranca sola con la primera interacción (los navegadores no permiten audio antes)
        autoStart() {
            if (userChose || on) return;
            on = true;
            updateUI();
            refresh();
        },

        videoPlay(v) { playingVideos.add(v); refresh(); },
        videoStop(v) { playingVideos.delete(v); refresh(); }
    };
})();
/* ============================================================
   EFECTOS: confeti y pétalos a pantalla completa
   ============================================================ */
const FX = (() => {
    const canvas = $('#fx-canvas');
    const ctx = canvas.getContext('2d');
    const COLORS = ['#FFB5A7', '#FDE2E4', '#E2E2FF', '#FFD166', '#FF99C8', '#D4AF37', '#fb7185'];
    let parts = [], running = false, w = 0, h = 0;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth; h = window.innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function add(p) { parts.push(p); if (!running) { running = true; requestAnimationFrame(loop); } }

    function burst(count = 90, x = w / 2, y = h / 3) {
        if (isMobile) count = Math.round(count * 0.45);
        else if (w < 640) count = Math.round(count * 0.6);
        if (reduceMotion) count = Math.min(count, 20);
        for (let i = 0; i < count; i++) {
            const kind = Math.random() < 0.45 ? 'petal' : (Math.random() < 0.5 ? 'rect' : 'dot');
            add({
                kind, x, y,
                vx: rand(-7, 7), vy: rand(-11, 2),
                size: rand(4, 10), rot: rand(0, 6.28), vr: rand(-0.2, 0.2),
                color: kind === 'petal' ? ['#e11d48', '#be123c', '#fb7185', '#f43f5e'][i % 4] : COLORS[i % COLORS.length],
                alpha: 1, decay: rand(0.006, 0.013), g: 0.18
            });
        }
    }

    // lluvia suave de pétalos
    function shower(count = 28) {
        if (reduceMotion) return;
        if (isMobile) count = Math.round(count * 0.4);
        else if (w < 640) count = Math.round(count * 0.6);
        for (let i = 0; i < count; i++) {
            setTimeout(() => add({
                kind: 'petal', x: rand(0, w), y: -20,
                vx: rand(-0.8, 0.8), vy: rand(1.2, 2.6),
                size: rand(6, 11), rot: rand(0, 6.28), vr: rand(-0.05, 0.05),
                color: ['#e11d48', '#fb7185', '#f43f5e', '#fda4af'][i % 4],
                alpha: 0.95, decay: 0.0025, g: 0.005, sway: rand(0, 6.28)
            }), i * 140);
        }
    }

    function drawPetal(p) {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(-s * 1.1, s * 0.2, -s * 0.8, -s * 1.1, 0, -s);
        ctx.bezierCurveTo(s * 0.8, -s * 1.1, s * 1.1, s * 0.2, 0, s);
        ctx.fill();
    }

    function loop() {
        ctx.clearRect(0, 0, w, h);
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.vy += p.g;
            p.x += p.vx + (p.sway !== undefined ? Math.sin((p.sway += 0.03)) * 0.8 : 0);
            p.y += p.vy;
            p.rot += p.vr;
            p.alpha -= p.decay;
            if (p.alpha <= 0 || p.y > h + 40) { parts.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            if (p.kind === 'petal') drawPetal(p);
            else if (p.kind === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.283); ctx.fill(); }
            ctx.restore();
        }
        if (parts.length) requestAnimationFrame(loop);
        else { running = false; ctx.clearRect(0, 0, w, h); }
    }

    window.addEventListener('resize', resize);
    resize();
    return { burst, shower };
})();

/* ============================================================
   🌹 ROSA REALISTA (canvas)
   Cada pétalo es una forma con curvatura, degradado de base
   oscura a borde claro, sombra propia, venas y brillo en el
   labio. Se dibujan de fuera hacia dentro en anillos que
   florecen en cascada. Incluye sépalos, tallo con espinas,
   hojas compuestas con venas, gotas de rocío y pétalos que caen.
   ============================================================ */
const Rose = (() => {
    const canvas = $('#rose-canvas');
    const ctx = canvas.getContext('2d');
    const W = 360, H = 460;
    const HX = W / 2, HY = 168;          // centro de la flor
    const DURATION = 3400;               // ms que tarda en abrir
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    // Generador pseudoaleatorio con semilla: la rosa siempre sale igual de bonita
    function mulberry32(a) {
        return () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const rnd = mulberry32(20241);

    const easeOutBack = (x) => { const c1 = 1.05, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const easeInOut = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

    // Anillos de pétalos, de fuera hacia dentro
    const LAYERS = [
        { n: 6, len: 118, wid: 108, off: 12 },
        { n: 6, len: 102, wid: 96, off: 10 },
        { n: 5, len: 86, wid: 82, off: 8 },
        { n: 5, len: 68, wid: 64, off: 6 },
        { n: 4, len: 50, wid: 48, off: 4 },
        { n: 3, len: 34, wid: 34, off: 2 }
    ];

    const petals = [];
    LAYERS.forEach((L, li) => {
        const twist = li * 0.95;
        for (let j = 0; j < L.n; j++) {
            petals.push({
                li,
                ang: (j / L.n) * Math.PI * 2 + twist + (rnd() - 0.5) * 0.35,
                js: 0.92 + rnd() * 0.16,       // variación de tamaño
                tone: rnd() * 2 - 1,           // variación de color
                lean: (rnd() - 0.5) * 0.18,    // asimetría de la punta
                L
            });
        }
    });

    function petalPath(L, Wd, lean = 0) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-Wd * 0.55, -L * 0.05, -Wd * 0.64, -L * 0.62, -Wd * (0.40 + lean), -L * 0.88);
        ctx.bezierCurveTo(-Wd * 0.28, -L * 1.03, -Wd * 0.07, -L * 1.05, 0, -L * 1.0);
        ctx.bezierCurveTo(Wd * 0.07, -L * 1.05, Wd * 0.28, -L * 1.03, Wd * (0.40 - lean), -L * 0.88);
        ctx.bezierCurveTo(Wd * 0.64, -L * 0.62, Wd * 0.55, -L * 0.05, 0, 0);
        ctx.closePath();
    }

    function drawPetal(p, prog) {
        const e = easeOutBack(clamp(prog));
        const k = 0.34 + 0.66 * e;
        const L = p.L.len * p.js * k;
        const Wd = p.L.wid * p.js * (0.5 + 0.5 * e);
        const lightness = 27 + p.tone * 3 + p.li * 0.6;

        ctx.save();
        ctx.rotate(p.ang);
        ctx.translate(0, -p.L.off * e);

        // sombra propia para que cada pétalo se despegue del anterior
        ctx.shadowColor = 'rgba(15, 0, 5, 0.5)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 3;

        const body = ctx.createLinearGradient(0, 0, 0, -L);
        body.addColorStop(0, 'hsl(352, 90%, 8%)');
        body.addColorStop(0.28, 'hsl(350, 85%, 17%)');
        body.addColorStop(0.62, `hsl(348, 78%, ${lightness}%)`);
        body.addColorStop(0.9, `hsl(347, 74%, ${lightness + 11}%)`);
        body.addColorStop(1, `hsl(346, 70%, ${lightness + 18}%)`);
        petalPath(L, Wd, p.lean);
        ctx.fillStyle = body;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Recortamos al pétalo para pintar volumen, venas y brillo
        ctx.save();
        petalPath(L, Wd, p.lean);
        ctx.clip();

        // curvatura lateral (el pétalo es una copa, los bordes caen)
        const side = ctx.createLinearGradient(-Wd * 0.62, 0, Wd * 0.62, 0);
        side.addColorStop(0, 'rgba(20, 0, 8, 0.42)');
        side.addColorStop(0.28, 'rgba(20, 0, 8, 0)');
        side.addColorStop(0.62, 'rgba(255, 190, 200, 0.07)');
        side.addColorStop(1, 'rgba(20, 0, 8, 0.45)');
        ctx.fillStyle = side;
        ctx.fillRect(-Wd, -L * 1.1, Wd * 2, L * 1.2);

        // venas
        ctx.strokeStyle = 'rgba(50, 0, 14, 0.22)';
        ctx.lineWidth = 0.7;
        for (let v = -3; v <= 3; v++) {
            ctx.beginPath();
            ctx.moveTo(0, -L * 0.04);
            ctx.quadraticCurveTo(v * Wd * 0.11, -L * 0.45, v * Wd * 0.17, -L * 0.93);
            ctx.stroke();
        }

        // borde aterciopelado más claro
        const lip = ctx.createLinearGradient(0, -L * 0.78, 0, -L * 1.04);
        lip.addColorStop(0, 'rgba(255, 170, 190, 0)');
        lip.addColorStop(0.6, 'rgba(255, 150, 175, 0.22)');
        lip.addColorStop(1, 'rgba(255, 215, 225, 0.5)');
        ctx.fillStyle = lip;
        ctx.fillRect(-Wd, -L * 1.1, Wd * 2, L * 0.4);

        // reflejo suave de luz
        const sheen = ctx.createRadialGradient(-Wd * 0.18, -L * 0.62, 1, -Wd * 0.18, -L * 0.62, L * 0.4);
        sheen.addColorStop(0, 'rgba(255, 190, 205, 0.20)');
        sheen.addColorStop(1, 'rgba(255, 190, 205, 0)');
        ctx.fillStyle = sheen;
        ctx.fillRect(-Wd, -L * 1.1, Wd * 2, L * 1.2);
        ctx.restore();

        // línea fina en el borde del labio
        ctx.strokeStyle = 'rgba(255, 190, 205, 0.28)';
        ctx.lineWidth = 1;
        petalPath(L, Wd, p.lean);
        ctx.stroke();

        ctx.restore();
    }

    function drawSepals(e) {
        const angles = [-0.95, -0.45, 0, 0.45, 0.95];
        angles.forEach((a, i) => {
            const len = (118 + (i % 2) * 12) * (0.7 + 0.3 * e);
            const w = 15;
            ctx.save();
            ctx.rotate(Math.PI + a);
            const g = ctx.createLinearGradient(0, 0, 0, -len);
            g.addColorStop(0, '#0f3d2a');
            g.addColorStop(1, '#3f9b6c');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(w * 1.3, -len * 0.3, w * 0.9, -len * 0.75, 3, -len);
            ctx.bezierCurveTo(-w * 0.7, -len * 0.72, -w * 1.3, -len * 0.3, 0, 0);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
        });
    }

    function drawCore(e) {
        const r = 24 * (0.45 + 0.55 * e);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        g.addColorStop(0, 'hsl(352, 92%, 6%)');
        g.addColorStop(0.7, 'hsl(350, 88%, 14%)');
        g.addColorStop(1, 'hsla(350, 85%, 20%, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // espiral del capullo
        ctx.strokeStyle = 'rgba(255, 110, 135, 0.28)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4.2; a += 0.12) {
            const rr = a * 1.75 * (0.5 + 0.5 * e);
            const x = Math.cos(a + 0.6) * rr, y = Math.sin(a + 0.6) * rr * 0.92;
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawDew(t) {
        const alpha = clamp((t - 0.82) * 5.5);
        if (!alpha) return;
        [[-36, -66, 4.6], [30, -34, 3.6], [-8, -96, 3.1], [48, 24, 3.6], [-52, 18, 3]].forEach(([x, y, r]) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0.3, x, y, r);
            g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            g.addColorStop(0.45, 'rgba(255, 220, 230, 0.35)');
            g.addColorStop(1, 'rgba(255, 120, 150, 0.12)');
            ctx.fillStyle = g;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    /* ---------- tallo, espinas y hojas ---------- */
    const S = { x0: HX, y0: HY + 14, x1: HX + 18, y1: HY + 110, x2: HX - 26, y2: HY + 215, x3: HX - 2, y3: H + 14 };

    function bez(t) {
        const u = 1 - t;
        const x = u * u * u * S.x0 + 3 * u * u * t * S.x1 + 3 * u * t * t * S.x2 + t * t * t * S.x3;
        const y = u * u * u * S.y0 + 3 * u * u * t * S.y1 + 3 * u * t * t * S.y2 + t * t * t * S.y3;
        const dx = 3 * u * u * (S.x1 - S.x0) + 6 * u * t * (S.x2 - S.x1) + 3 * t * t * (S.x3 - S.x2);
        const dy = 3 * u * u * (S.y1 - S.y0) + 6 * u * t * (S.y2 - S.y1) + 3 * t * t * (S.y3 - S.y2);
        return { x, y, ang: Math.atan2(dy, dx) };
    }

    function drawStem() {
        ctx.lineCap = 'round';
        const path = () => {
            ctx.beginPath();
            ctx.moveTo(S.x0, S.y0);
            ctx.bezierCurveTo(S.x1, S.y1, S.x2, S.y2, S.x3, S.y3);
        };
        path(); ctx.strokeStyle = '#0f3d2a'; ctx.lineWidth = 12; ctx.stroke();
        path(); ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 8.5; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(160, 230, 190, 0.22)'; ctx.lineWidth = 2.2;
        ctx.save(); ctx.translate(-1.8, 0); ctx.stroke(); ctx.restore();

        // espinas
        [[0.3, 1], [0.52, -1], [0.82, 1]].forEach(([t, side]) => {
            const p = bez(t);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.ang + side * (Math.PI / 2 - 0.35));
            ctx.fillStyle = '#7a1d2b';
            ctx.beginPath();
            ctx.moveTo(-3.2, 0);
            ctx.quadraticCurveTo(0, -6, 3, -11);
            ctx.quadraticCurveTo(4, -5, 3.2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    function leaflet(size) {
        const N = 12;
        const top = [], bottom = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const w = size * 0.2 * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.97 + 0.02)), 0.85) * (1 - t * 0.25);
            const tooth = i % 2 ? 1.12 : 0.93;
            top.push([size * t, -w * tooth]);
            bottom.push([size * t, w * tooth]);
        }
        ctx.beginPath();
        top.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
        ctx.closePath();

        const g = ctx.createLinearGradient(0, 0, size, 0);
        g.addColorStop(0, '#10432d');
        g.addColorStop(0.55, '#2d6a4f');
        g.addColorStop(1, '#4aa579');
        ctx.fillStyle = g;
        ctx.fill();

        ctx.save();
        ctx.clip();
        const shade = ctx.createLinearGradient(0, -size * 0.2, 0, size * 0.2);
        shade.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        shade.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, -size * 0.3, size, size * 0.6);
        ctx.restore();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // nervadura central y secundarias
        ctx.strokeStyle = 'rgba(190, 240, 205, 0.45)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.96, 0); ctx.stroke();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(190, 240, 205, 0.28)';
        for (let t = 0.14; t < 0.85; t += 0.13) {
            const x = size * t, w = size * 0.15 * Math.sin(Math.PI * t);
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + size * 0.1, -w); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + size * 0.1, w); ctx.stroke();
        }
    }

    function leafCluster(x, y, base, sc, wob) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(base + wob);
        ctx.strokeStyle = '#1f5a3f';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30 * sc, 0); ctx.stroke();

        ctx.save(); ctx.translate(30 * sc, 0); leaflet(66 * sc); ctx.restore();
        ctx.save(); ctx.translate(16 * sc, 0); ctx.rotate(-0.8); leaflet(48 * sc); ctx.restore();
        ctx.save(); ctx.translate(16 * sc, 0); ctx.rotate(0.8); leaflet(48 * sc); ctx.restore();
        ctx.restore();
    }

    /* ---------- destellos de fondo ---------- */
    const sparkles = Array.from({ length: 16 }, () => ({
        x: rnd() * W, y: rnd() * (H - 60), r: 1.2 + rnd() * 2.2, ph: rnd() * 6.28, sp: 0.001 + rnd() * 0.002
    }));

    function drawSparkles(now) {
        sparkles.forEach((s) => {
            const a = reduceMotion ? 0.5 : 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * s.sp + s.ph));
            ctx.save();
            ctx.globalAlpha = a;
            ctx.strokeStyle = '#ffe3ea';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x - s.r * 2, s.y); ctx.lineTo(s.x + s.r * 2, s.y);
            ctx.moveTo(s.x, s.y - s.r * 2); ctx.lineTo(s.x, s.y + s.r * 2);
            ctx.stroke();
            ctx.restore();
        });
    }

    /* ---------- pétalos que caen ---------- */
    let falling = [];
    function spawnFalling(n) {
        for (let i = 0; i < n; i++) {
            falling.push({
                x: HX + rand(-60, 60), y: HY + rand(-20, 60),
                vx: rand(-0.35, 0.35), vy: rand(0.25, 0.7),
                rot: rand(0, 6.28), vr: rand(-0.03, 0.03),
                size: rand(11, 19), ph: rand(0, 6.28), hue: rand(344, 354)
            });
        }
    }

    function drawFalling(dt) {
        for (let i = falling.length - 1; i >= 0; i--) {
            const p = falling[i];
            p.ph += 0.03 * dt / 16;
            p.x += (p.vx + Math.sin(p.ph) * 0.45) * dt / 16;
            p.y += p.vy * dt / 16;
            p.rot += p.vr * dt / 16;
            if (p.y > H + 30) { falling.splice(i, 1); continue; }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.ph)));
            const g = ctx.createLinearGradient(0, 0, 0, -p.size);
            g.addColorStop(0, `hsl(${p.hue}, 85%, 18%)`);
            g.addColorStop(1, `hsl(${p.hue}, 75%, 42%)`);
            ctx.fillStyle = g;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 4;
            petalPath(p.size, p.size * 0.9);
            ctx.fill();
            ctx.restore();
        }
    }

    /* ---------- bucle principal ---------- */
    const state = { t: 0, start: 0, playing: false, nextFall: 0 };
    let visible = false, running = false, last = 0, lastDraw = 0;

    function bloom() {
        if (reduceMotion) { state.t = 1; state.playing = false; draw(performance.now(), 16); return; }
        state.t = 0;
        state.start = performance.now();
        state.playing = true;
        falling = [];
        start();
    }

    function draw(now, dt) {
        const t = state.t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        drawSparkles(now);

        const sway = reduceMotion ? 0 : Math.sin(now * 0.0011) * 0.012;
        const wob = reduceMotion ? 0 : Math.sin(now * 0.0016) * 0.03;

        ctx.save();
        ctx.translate(HX, H - 10);
        ctx.rotate(sway);
        ctx.translate(-HX, -(H - 10));

        // tallo y hojas (detrás de la flor)
        drawStem();
        const n1 = bez(0.5), n2 = bez(0.72);
        leafCluster(n1.x, n1.y, -0.55, 0.95, wob);
        leafCluster(n2.x, n2.y, Math.PI + 0.55, 0.85, -wob);

        // halo de luz
        const aura = ctx.createRadialGradient(HX, HY, 10, HX, HY, 190);
        aura.addColorStop(0, `rgba(255, 70, 110, ${0.30 * easeInOut(clamp(t * 1.4))})`);
        aura.addColorStop(1, 'rgba(255, 70, 110, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(HX, HY, 190, 0, Math.PI * 2);
        ctx.fill();

        // flor
        const headScale = 0.8 + 0.2 * easeInOut(clamp(t * 1.2));
        ctx.save();
        ctx.translate(HX, HY);
        ctx.scale(headScale, headScale * 0.95);

        drawSepals(easeInOut(clamp(t * 1.6)));

        const maxDelay = 0.42;
        petals.forEach((p) => {
            const delay = (p.li / (LAYERS.length - 1)) * maxDelay;
            drawPetal(p, clamp((t - delay) / (1 - maxDelay)));
        });

        drawCore(easeInOut(clamp(t / 0.7)));
        drawDew(t);
        ctx.restore();
        ctx.restore();

        drawFalling(dt);
    }

    function frame(now) {
        if (!visible) { running = false; return; }
        if (!state.playing && !falling.length && now - lastDraw < 33) { requestAnimationFrame(frame); return; }
        lastDraw = now;
        const dt = Math.min(50, now - last) || 16;
        last = now;

        if (state.playing) {
            state.t = clamp((now - state.start) / DURATION);
            if (state.t >= 1) { state.playing = false; spawnFalling(12); state.nextFall = now + 4500; }
        } else if (state.t >= 1 && !reduceMotion && now > state.nextFall) {
            spawnFalling(1);
            state.nextFall = now + rand(3500, 6500);
        }

        draw(now, dt);
        requestAnimationFrame(frame);
    }

    function start() {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
    }

    // La rosa se dibuja cerrada y solo florece cuando se pulsa el botón
    new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) {
            start();
        }
    }, { threshold: 0.2 }).observe(canvas);

    draw(performance.now(), 16);
    return { bloom };
})();

/* ============================================================
   INTERFAZ
   ============================================================ */
function renderCounter() {
    const start = new Date(config.startDate + 'T00:00:00');
    const now = new Date();
    if (isNaN(start) || start > now) {
        ['years', 'months', 'days'].forEach((k) => { $('#cnt-' + k).textContent = '0'; });
        return;
    }
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    if (days < 0) {
        months--;
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) { years--; months += 12; }
    $('#cnt-years').textContent = years;
    $('#cnt-months').textContent = months;
    $('#cnt-days').textContent = days;
}

function renderTexts() {
    $('#hero-name').textContent = config.name;
    renderCounter();
    $('#letter-body').textContent = config.letter;
    $('#letter-sign').textContent = config.sign;
}



function renderPolaroids() {
    const grid = $('#polaroid-grid');



    if (!grid) {
        console.error('No se encontró #polaroid-grid');
        return;
    }

    grid.innerHTML = config.polaroids.map((p, i) => {
        const esVideo = p.type === 'video' ||
            /\.(mp4|webm|ogg)(\?.*)?$/i.test(p.url);

        return `
        <div class="flip-card h-[22rem] cursor-pointer group"
             data-idx="${i}" role="button" tabindex="0"
             aria-label="Polaroid: ${esc(p.caption)}. Pulsa para girarla">

            <div class="flip-card-inner">

                <div class="flip-card-front bg-[#1a1520] p-4 shadow-xl border border-rose-500/20 flex flex-col justify-between">

                    <div class="washi-tape-1 absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 z-20"></div>

                    <div class="h-60 overflow-hidden rounded-xl bg-stone-900">

                        ${esVideo ? `
                            <video
                                src="${esc(p.url)}"
                                controls
                                playsinline
                                preload="metadata"
                                class="w-full h-full object-cover"
                                onerror="console.error('No se pudo cargar:', this.src)">
                                Tu navegador no puede reproducir este video.
                            </video>
                        ` : `
                            <img
                                src="${esc(p.url)}"
                                alt="${esc(p.caption)}"
                                loading="lazy"
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onerror="this.onerror=null;this.src='https://placehold.co/600x600/1a1520/fb7185?text=Foto+Amistad'">
                        `}

                    </div>

                    <span class="font-handwriting text-2xl text-center text-stone-300 font-bold pt-2">
                        ${esc(p.caption)}
                    </span>

                </div>

                <div class="flip-card-back bg-gradient-to-b from-[#1e1228] to-[#1a0f1f] p-6 shadow-xl border border-rose-500/20 flex flex-col items-center justify-center text-center gap-3">

                    <div class="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center text-xl shadow-inner">
                        <i class="fa-solid fa-heart"></i>
                    </div>

                    <h4 class="font-handwriting text-3xl text-rose-400 font-bold">
                        ${esc(p.caption)}
                    </h4>

                    <p class="text-sm sm:text-xs text-stone-400 leading-relaxed font-medium">
                        ${esc(p.note)}
                    </p>

                    <span class="text-[10px] text-rose-500/70 font-semibold tracking-wider uppercase pt-2">
                        Toca para voltear
                    </span>

                </div>
            </div>
        </div>
        `;
    }).join('');
}



/* ---- polaroids: giro ---- */
function flip(card) {
    card.classList.toggle('flipped');
    Sound.tick();
}

$('#polaroid-grid').addEventListener('click', (e) => {
    if (e.target.closest('video')) return; // no girar al usar el video
    const card = e.target.closest('.flip-card');
    if (card) flip(card);
});

$('#polaroid-grid').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('flip-card')) {
        e.preventDefault();
        flip(e.target);
    }
});

/* ---- Video: pausa la música mientras suena y la reanuda al terminar ---- */
function checkVideoAudio(v) {
    setTimeout(() => {
        if (v.paused) return;
        const sinAudio =
            v.mozHasAudio === false ||
            (typeof v.webkitAudioDecodedByteCount === 'number' && v.webkitAudioDecodedByteCount === 0) ||
            (v.audioTracks && v.audioTracks.length === 0);
        if (sinAudio) toast('Este video no tiene pista de audio (revisa el archivo)');
    }, 1500);
}

const gridEl = $('#polaroid-grid');
// los eventos de media no burbujean, por eso se usa captura (true)
gridEl.addEventListener('play', (e) => {
    const v = e.target;
    if (v.tagName !== 'VIDEO') return;
    v.muted = false;
    v.volume = 1;
    Sound.videoPlay(v);
    checkVideoAudio(v);
}, true);

['pause', 'ended'].forEach((ev) => {
    gridEl.addEventListener(ev, (e) => {
        if (e.target.tagName === 'VIDEO') Sound.videoStop(e.target);
    }, true);
});

/* ---- Música de fondo automática con la primera interacción ---- */
(() => {
    const start = (e) => {
        if (e.target.closest && e.target.closest('#btn-audio')) return; // ese botón la maneja solo
        Sound.autoStart();
        ['pointerdown', 'keydown'].forEach((t) => document.removeEventListener(t, start));
    };
    ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, start));
})();

    
/* ---- sobre / carta ---- */
function openEnvelope() {
    const env = $('#envelope');
    if (env.getAttribute('aria-expanded') === 'true') return;
    env.setAttribute('aria-expanded', 'true');
    env.removeAttribute('tabindex');
    env.style.cursor = 'default';
    $('#envelope-closed').classList.add('hidden');
    const opened = $('#envelope-opened');
    opened.classList.remove('hidden');
    opened.classList.add('letter-in');
    Sound.chime();
    FX.burst(60);
}
$('#envelope').addEventListener('click', openEnvelope);
$('#envelope').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
});

/* ---- botones principales ---- */
function bloomRose() { Sound.chime(); Rose.bloom(); FX.burst(50); }
$('#rose-canvas').addEventListener('click', bloomRose);
$('#btn-bloom').addEventListener('click', bloomRose);
$('#btn-audio').addEventListener('click', Sound.toggle);

/* ---- panel de personalización ---- */
const drawer = $('#config-drawer');
const backdrop = $('#drawer-backdrop');

function setDrawer(open) {
    drawer.classList.toggle('translate-x-full', !open);
    drawer.setAttribute('aria-hidden', String(!open));
    backdrop.classList.toggle('hidden', !open);
    if (open) {
        $('#cfg-name').value = config.name;
        $('#cfg-date').value = config.startDate;
        $('#cfg-letter').value = config.letter;
        $('#cfg-sign').value = config.sign;
        $('#cfg-name').focus({ preventScroll: true });
    }
}

$('#btn-settings').addEventListener('click', () => setDrawer(true));
$('#btn-close-drawer').addEventListener('click', () => setDrawer(false));
$('#btn-cancel').addEventListener('click', () => setDrawer(false));
backdrop.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

$('#config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    config.name = $('#cfg-name').value.trim() || config.name;
    config.startDate = $('#cfg-date').value || config.startDate;
    config.letter = $('#cfg-letter').value;
    config.sign = $('#cfg-sign').value;
    renderTexts();
    setDrawer(false);
    toast(Store.save(config) ? 'Cambios guardados' : 'No se pudo guardar en este navegador');
});

/* ---- arranque ---- */
// Cada parte arranca por separado: si una falla, las demás siguen funcionando
function safe(fn) {
    try { fn(); } catch (err) { console.error('Error al iniciar:', err); }
}
safe(renderTexts);
safe(renderPolaroids);
setTimeout(() => safe(() => FX.shower()), 500);

/* ---- Scroll-reveal: anima secciones al entrar en pantalla ---- */
safe(() => {
    const items = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('visible'));
        return;
    }
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => revealObserver.observe(el));
});

/* ---- Polaroid scroll dots (solo en móvil) ---- */
function updateScrollDots() {
    if (window.innerWidth >= 640) return;
    const grid = $('#polaroid-grid');
    const dots = $('#scroll-dots');
    if (!grid || !dots) return;
    const cards = grid.querySelectorAll('.flip-card');
    if (!cards.length) return;

    if (dots.children.length !== cards.length) {
        dots.innerHTML = '';
        cards.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'scroll-dot' + (i === 0 ? ' active' : '');
            dots.appendChild(dot);
        });
    }

    const gridRect = grid.getBoundingClientRect();
    const center = gridRect.left + gridRect.width / 2;
    let closest = 0, minDist = Infinity;
    cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - center);
        if (dist < minDist) { minDist = dist; closest = i; }
    });

    dots.querySelectorAll('.scroll-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === closest);
    });
}

const polaroidGrid = $('#polaroid-grid');
if (polaroidGrid) {
    polaroidGrid.addEventListener('scroll', updateScrollDots, { passive: true });
    window.addEventListener('resize', updateScrollDots);
    setTimeout(() => safe(updateScrollDots), 600);

    /* ---- Ocultar la pista "Desliza" después de la primera interacción ---- */
    polaroidGrid.addEventListener('scroll', () => {
        const hint = document.querySelector('.swipe-hint');
        if (!hint) return;
        hint.style.transition = 'opacity 0.5s';
        hint.style.opacity = '0';
        setTimeout(() => { hint.style.display = 'none'; }, 500);
    }, { passive: true, once: true });
}

// Avisa a la pantalla de carga que todo quedó listo
window.__giftReady = true;
if (window.__giftCheck) setTimeout(window.__giftCheck, 100);