import { mount } from 'gss-lang';
import { toGss } from './to-gss.js';
import { initPanel } from './panel.js';

const API = (import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337') + '/api';
const POLL_MS = 3000;
const BORN_MS = 2500; // keep the .born class long enough for the pop animation

const canvas = document.querySelector('#universe');
const stats = document.querySelector('#stats');
const log = document.querySelector('#log');

let scene = null;
let lastSource = '';
let known = null; // documentIds seen at the previous poll
const bornAt = new Map(); // documentId -> timestamp

const get = (path) =>
  fetch(API + path)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${path}`))))
    .then((r) => r.data);

function announce(text) {
  const li = document.createElement('li');
  li.textContent = text;
  log.append(li);
  setTimeout(() => li.remove(), 6000);
}

async function tick() {
  const [stars, constellations, universe] = await Promise.all([
    get('/stars?populate[planets][populate]=moons'),
    get('/constellations?populate=stars'),
    get('/universe').catch(() => null),
  ]);

  const bodies = stars.flatMap((s) => [s, ...s.planets, ...s.planets.flatMap((p) => p.moons ?? [])]);
  const now = Date.now();

  if (known) {
    for (const b of bodies) {
      if (!known.has(b.documentId)) {
        bornAt.set(b.documentId, now);
        announce(`✦ ${b.name} is born`);
      }
    }
  }
  known = new Set(bodies.map((b) => b.documentId));
  for (const [id, t] of bornAt) if (now - t > BORN_MS) bornAt.delete(id);

  window.dispatchEvent(new CustomEvent('universe:data', { detail: { stars } }));

  const planets = stars.reduce((n, s) => n + s.planets.length, 0);
  stats.textContent = `${stars.length} stars · ${planets} planets · ${bodies.length - stars.length - planets} moons · ${constellations.length} constellations`;

  const source = toGss({ stars, constellations, universe, born: new Set(bornAt.keys()) });
  if (source === lastSource) return;
  lastSource = source;
  if (scene) scene.update(source);
  else scene = mount(canvas, source);
}

let timer = null;

async function loop() {
  clearTimeout(timer);
  try {
    await tick();
  } catch (err) {
    stats.textContent = `Strapi unreachable: ${err.message}`;
  }
  timer = setTimeout(loop, POLL_MS);
}

// The panel asks for a refresh right after a create, so the planet pops in at once.
window.addEventListener('universe:refresh', loop);

initPanel(API);
loop();
