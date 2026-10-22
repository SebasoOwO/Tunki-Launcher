/* home-extras.js — lógica de los paneles Códigos (y base para Eventos).
   Se carga como módulo (cumple script-src 'self').
   Edita CODES para definir tus códigos válidos y su premio. */

const CODES = {
    HOYO2026: 'Capa exclusiva',
    BIENVENIDO: 'Kit inicial',
    MADMAX: 'Capa de Mad Max',
};

const STORAGE_KEY = 'redeemed-codes';

function getRedeemed() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

function setMessage(el, text, type) {
    el.textContent = text;
    el.className = 'code-message ' + (type || '');
}

export function initHomeExtras(root = document) {
    const input = root.querySelector('.code-input');
    const button = root.querySelector('.code-redeem');
    const message = root.querySelector('.code-message');
    if (!input || !button || !message) return;

    const redeem = () => {
        const code = input.value.trim().toUpperCase();
        if (!code) return setMessage(message, 'Escribe un código.', 'err');
        if (!(code in CODES)) return setMessage(message, 'Código inválido.', 'err');
        const done = getRedeemed();
        if (done.includes(code)) return setMessage(message, 'Ya canjeaste este código.', 'err');
        done.push(code);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
        input.value = '';
        setMessage(message, '¡Canjeado! Recibiste: ' + CODES[code], 'ok');
    };

    button.addEventListener('click', redeem);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') redeem(); });

    // Clic en un código de la lista = lo copia al campo
    root.querySelectorAll('.code-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            input.value = chip.dataset.code;
            chip.classList.add('copied');
            setTimeout(() => chip.classList.remove('copied'), 900);
            input.focus();
        });
    });
}

/* ============================================================
   Instancias en el inicio (mosaicos + destacado)
   Uso desde home.js:
       import { initHomeExtras, renderInstances } from './home-extras.js';
       renderInstances(instancesList, { onSelect: (inst) => { ... } });
   `instancesList` puede ser la lista de tu launcher (array con .name)
   o el objeto del instances.json ({ "Nombre": {...} }).
   ============================================================ */

const FALLBACK_COLORS = ['#2e7d32', '#1565c0', '#c2410c', '#7b1fa2', '#00838f', '#b8860b'];

function normalize(list) {
    const arr = Array.isArray(list)
        ? list
        : Object.entries(list || {}).map(([name, data]) => ({ name, ...data }));
    return arr.map((i) => {
        const loader = i.loadder || i.loader || {};
        return {
            raw: i,
            name: String(i.name || ''),
            mc: loader.minecraft_version || i.version || '',
            loader: loader.loadder_type || loader.loader_type || 'none',
            ui: i.ui || {},
        };
    }).filter((i) => i.name);
}

function safeColor(c, i) {
    return /^#[0-9a-f]{6}$/i.test(c || '') ? c : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

function safeUrl(u) {
    if (!u) return null;
    try {
        const url = new URL(u, document.baseURI);
        return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href.replace(/"/g, '%22') : null;
    } catch { return null; }
}

function paintArt(el, ui, index) {
    const color = safeColor(ui.color, index);
    const img = safeUrl(ui.image);
    el.style.backgroundImage = img
        ? `linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,0)), url("${img}")`
        : `linear-gradient(135deg, ${color}, #0b0b0f)`;
}

const loaderLabel = (l) => (l && l !== 'none' ? l.charAt(0).toUpperCase() + l.slice(1) : 'Vanilla');

export function renderInstances(list, { onSelect, onPlay, selectedName } = {}) {
    const tilesEl = document.querySelector('.store-tiles');
    const items = normalize(list);
    if (!tilesEl) return;
    tilesEl.replaceChildren();

    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'tile-empty';
        empty.textContent = 'Aún no hay instancias disponibles.';
        tilesEl.append(empty);
    }

    const select = async (item, tile) => {
        tilesEl.querySelectorAll('.tile.selected').forEach((t) => t.classList.remove('selected'));
        if (tile) tile.classList.add('selected');
        document.dispatchEvent(new CustomEvent('instance-selected', { detail: item.raw }));
        if (typeof onSelect === 'function') await onSelect(item.raw);
    };

    items.forEach((item, index) => {
        const tile = document.createElement('article');
        tile.className = 'tile';
        if (item.name === selectedName) tile.classList.add('selected');

        const art = document.createElement('div');
        art.className = 'tile-art';
        paintArt(art, item.ui, index);

        const body = document.createElement('div');
        body.className = 'tile-body';
        const name = document.createElement('div');
        name.className = 'tile-name';
        name.textContent = item.name;
        const sub = document.createElement('div');
        sub.className = 'tile-sub';
        sub.textContent = `${loaderLabel(item.loader)} · ${item.mc || '—'}`;
        const pill = document.createElement('span');
        pill.className = 'tile-pill' + (item.ui.badge ? ' new' : '');
        pill.textContent = item.ui.badge || (item.ui.tagline ? '' : 'Instancia');
        body.append(name, sub);
        if (pill.textContent) body.append(pill);

        tile.append(art, body);
        tile.addEventListener('click', () => select(item, tile));
        tilesEl.append(tile);
    });

    // Destacado: la instancia con ui.featured, o la primera
    const hero = document.querySelector('.store-hero');
    if (hero && items.length) {
        const idx = Math.max(0, items.findIndex((i) => i.ui.featured));
        const f = items[idx];
        const set = (sel, text) => { const el = hero.querySelector(sel); if (el) el.textContent = text; };
        set('.hero-title', f.name);
        set('.hero-text', f.ui.tagline || `${loaderLabel(f.loader)} · Minecraft ${f.mc}`);
        const color = safeColor(f.ui.color, idx);
        const img = safeUrl(f.ui.image);
        hero.style.setProperty('--hero-img', img ? `url("${img}")` : 'none');
        hero.style.setProperty('--hero-color', color);
        const btn = hero.querySelector('.hero-btn.primary');
        if (btn) btn.onclick = async () => {
            await select(f, tilesEl.children[idx]);
            if (typeof onPlay === 'function') onPlay(f.raw);
        };
    }
}


/* ============================================================
   Eventos (se leen de events.json, lo genera el panel de admin)
   Formato: [{ name, date (ISO), duration_hours, description, badge }]
   Uso: renderEvents(listaDeEventos)   // null = error al cargar
   ============================================================ */
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function eventState(ev, now = new Date()) {
    const start = new Date(ev.date);
    if (isNaN(start)) return null;
    const end = new Date(start.getTime() + (Number(ev.duration_hours) || 2) * 36e5);
    if (now >= end) return null;                      // ya terminó
    if (now >= start) return { start, live: true, text: 'En curso' };
    const time = start.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((startDay - today) / 864e5);
    const text = days === 0 ? `Hoy · ${time}` : days === 1 ? `Mañana · ${time}` : `Faltan ${days} días`;
    return { start, live: false, text };
}

export function renderEvents(events) {
    const list = document.querySelector('.events-list');
    if (!list) return;
    list.replaceChildren();

    const message = (txt) => {
        const d = document.createElement('div');
        d.className = 'tile-empty';
        d.style.padding = '14px 4px';
        d.textContent = txt;
        list.append(d);
    };

    if (!Array.isArray(events)) return message('No se pudieron cargar los eventos.');

    const upcoming = events
        .map((ev) => ({ ev, st: eventState(ev) }))
        .filter((x) => x.st && x.ev.name)
        .sort((a, b) => a.st.start - b.st.start)
        .slice(0, 6);

    if (!upcoming.length) return message('No hay eventos próximos.');

    upcoming.forEach(({ ev, st }) => {
        const item = document.createElement('div');
        item.className = 'event-item' + (st.live ? ' live' : '');
        if (ev.description) item.title = ev.description;

        const date = document.createElement('div');
        date.className = 'event-date';
        const day = document.createElement('b');
        day.textContent = st.start.getDate();
        date.append(day, document.createTextNode(MONTHS_ES[st.start.getMonth()]));

        const info = document.createElement('div');
        info.className = 'event-info';
        const name = document.createElement('div');
        name.className = 'event-name';
        name.textContent = ev.name;
        const meta = document.createElement('div');
        meta.className = 'event-meta';
        meta.textContent = st.text;
        info.append(name, meta);

        item.append(date, info);
        if (st.live || ev.badge) {
            const badge = document.createElement('span');
            badge.className = 'event-badge';
            badge.textContent = st.live ? 'En vivo' : ev.badge;
            item.append(badge);
        }
        list.append(item);
    });
}
