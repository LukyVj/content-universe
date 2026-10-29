// Seed the Content Universe with a starting galaxy.
// Usage (Strapi must run): STRAPI_TOKEN=xxx node seed-universe.mjs
const URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const TOKEN = process.env.STRAPI_TOKEN;
if (!TOKEN) throw new Error('Set STRAPI_TOKEN (Settings > API Tokens, Full access).');

async function call(method, path, data) {
  const res = await fetch(`${URL}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} (${data.name ?? ''}): ${JSON.stringify(json.error)}`);
  return json.data.documentId;
}

// publish = false leaves the entry as a draft (a ghost to publish during the demo).
const create = (type, data, publish = true) =>
  call('POST', `${type}${publish ? '?status=published' : ''}`, data);

// --- Stars ---------------------------------------------------------------
const sun = await create('stars', { name: 'Soleil', color: '#ffcc66', radius: 1.2, x: 0, z: 0 });

const orion = {};
for (const s of [
  { name: 'Betelgeuse', color: '#ff7a45', radius: 0.9, x: -22, z: -18 },
  { name: 'Rigel', color: '#9cc3ff', radius: 0.8, x: 18, z: 20 },
  { name: 'Bellatrix', color: '#c9d8ff', radius: 0.6, x: 20, z: -16 },
  { name: 'Saiph', color: '#b3c7ff', radius: 0.6, x: -16, z: 22 },
]) {
  orion[s.name] = await create('stars', s);
}

// --- Planets (orbit = distance to the star, speed = seconds per orbit) ----
const planets = [
  { name: 'Mercure', color: '#9e9e9e', radius: 0.15, material: 'rock', orbit: 2.5, speed: 4 },
  { name: 'Venus', color: '#e8c27a', radius: 0.25, material: 'glass', orbit: 3.5, speed: 7 },
  {
    name: 'Terre', color: '#3a7bd5', radius: 0.27, material: 'glass', orbit: 4.6, speed: 10, moons: [
      { name: 'Lune', color: '#dddddd', radius: 0.08 },
    ]
  },
  {
    name: 'Mars', color: '#d1603d', radius: 0.2, material: 'rock', orbit: 5.8, speed: 14, moons: [
      { name: 'Phobos', color: '#8d7b6a', radius: 0.05 },
      { name: 'Deimos', color: '#a89582', radius: 0.04 },
    ]
  },
  {
    name: 'Jupiter', color: '#d9a066', radius: 0.55, material: 'jelly', orbit: 7.6, speed: 24, moons: [
      { name: 'Io', color: '#f2e35c', radius: 0.07 },
      { name: 'Europe', color: '#cfc4b0', radius: 0.06 },
    ]
  },
  {
    name: 'Saturne', color: '#e3cf8f', radius: 0.48, material: 'metal', orbit: 9.6, speed: 32, rings: true, moons: [
      { name: 'Titan', color: '#e0a64a', radius: 0.08 },
    ]
  },
  // Drafts: publish them live during the demo.
  { name: 'Strapi Prime', color: '#4945ff', radius: 0.35, material: 'jelly', orbit: 11.5, speed: 18, rings: true, draft: true },
  { name: 'Ragnar', color: '#879b00', radius: 0.2, material: 'gold', orbit: 13, speed: 21, draft: true },
];

for (const { moons = [], draft, ...p } of planets) {
  const planet = await create('planets', { ...p, rings: !!p.rings, star: sun }, !draft);
  for (const m of moons) await create('moons', { ...m, planet });
  console.log(`${draft ? 'draft' : 'published'}  ${p.name}  (+${moons.length} moons)`);
}

// --- Constellation -------------------------------------------------------
await create('constellations', { name: 'Orion', stars: Object.values(orion) });

// --- Universe (single type) ----------------------------------------------
await call('PUT', 'universe?status=published', { background: '#05050f', glow: '#4945ff', spin: 0.2 });

console.log('Universe ready.');
