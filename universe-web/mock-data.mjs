// Fake Strapi responses, shaped like the REST API, to test toGss() without Strapi.
let i = 0;
const id = () => `doc${(i++).toString(36).padStart(4, '0')}xyz`;
const moon = (name, color, radius) => ({ documentId: id(), name, color, radius });
const planet = (name, color, radius, material, orbit, speed, rings, moons = []) =>
  ({ documentId: id(), name, color, radius, material, orbit, speed, rings, moons });

export const stars = [
  { documentId: id(), name: 'Soleil', color: '#ffcc66', radius: 1.2, x: 0, z: 0, planets: [
    planet('Mercure', '#9e9e9e', 0.15, 'rock', 2.5, 4, false),
    planet('Venus', '#e8c27a', 0.25, 'glass', 3.5, 7, false),
    planet('Terre', '#3a7bd5', 0.27, 'glass', 4.6, 10, false, [moon('Lune', '#dddddd', 0.08)]),
    planet('Mars', '#d1603d', 0.2, 'rock', 5.8, 14, false, [moon('Phobos', '#8d7b6a', 0.05), moon('Deimos', '#a89582', 0.04)]),
    planet('Jupiter', '#d9a066', 0.55, 'jelly', 7.6, 24, false, [moon('Io', '#f2e35c', 0.07), moon('Europe', '#cfc4b0', 0.06)]),
    planet('Saturne', '#e3cf8f', 0.48, 'metal', 9.6, 32, true, [moon('Titan', '#e0a64a', 0.08)]),
    planet('Strapi Prime', '#4945ff', 0.35, 'jelly', 11.5, 18, true),
  ] },
  { documentId: id(), name: 'Betelgeuse', color: '#ff7a45', radius: 0.9, x: -22, z: -18, planets: [] },
  { documentId: id(), name: 'Bellatrix', color: '#c9d8ff', radius: 0.6, x: 20, z: -16, planets: [] },
  { documentId: id(), name: 'Rigel', color: '#9cc3ff', radius: 0.8, x: 18, z: 20, planets: [] },
  { documentId: id(), name: 'Saiph', color: '#b3c7ff', radius: 0.6, x: -16, z: 22, planets: [] },
];

export const constellations = [
  { documentId: id(), name: 'Orion', stars: stars.slice(1).map(({ documentId }) => ({ documentId })) },
];

export const universe = { background: '#05050f', glow: '#4945ff', spin: 0.2 };
