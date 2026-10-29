// Turns the Strapi content into a GSS scene.
// GSS cameras stay within 15 units, so the layout scales the data to fit.

const MATERIAL = {
  rock: 'matte()',
  metal: 'metal(0.15)',
  glass: 'glass(1.5, frosted 0.3)',
  jelly: 'jelly(0.6)',
  gold: 'gold',
};

const SKY_RADIUS = 5; // farthest star from the center
const SYSTEM_RADIUS = 3.4; // widest orbit

const n = (v, d = 0) => Number(v ?? d);
const f = (v) => (Math.round(v * 1000) / 1000).toString();
const hex = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(v ?? '') ? v : d);

// Stable ids: GSS ids accept letters, digits and dashes.
const slug = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uid = (prefix, doc) => `${prefix}-${slug(doc.name || doc.documentId)}-${doc.documentId.slice(0, 4)}`;

// A stable start angle per body, so planets do not all line up on the x axis.
const angleOf = (doc) => {
  let h = 0;
  for (const c of doc.documentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 360) * (Math.PI / 180);
};

export function toGss({ stars, constellations = [], universe, born = new Set() }) {
  const sky = Math.max(1, ...stars.map((s) => Math.hypot(n(s.x), n(s.z))));
  const widest = Math.max(1, ...stars.flatMap((s) => s.planets.map((p) => n(p.orbit, 1))));
  const kSky = SKY_RADIUS / sky;
  const kOrbit = SYSTEM_RADIUS / widest;

  const pos = new Map(); // star documentId -> [x, z]
  const tree = [];
  const rules = [];
  const bornClass = (doc) => (born.has(doc.documentId) ? '.born' : '');

  for (const star of stars) {
    const sid = uid('s', star);
    const x = n(star.x) * kSky;
    const z = n(star.z) * kSky;
    pos.set(star.documentId, [x, z]);
    const color = hex(star.color, '#ffcc66');

    tree.push(`  sphere.star${bornClass(star)}#${sid};`);
    rules.push(
      `#${sid} { translate: ${f(x)} 0 ${f(z)}; radius: ${f(n(star.radius, 1) * 0.45)}; ` +
      `color: ${color}; material: emissive(${color}, 0.8); }`
    );

    for (const planet of star.planets) {
      const oid = uid('o', planet);
      const pid = uid('p', planet);
      const a = angleOf(planet);
      const d = n(planet.orbit, 1) * kOrbit;
      const px = Math.cos(a) * d;
      const pz = Math.sin(a) * d;
      const r = Math.max(0.06, n(planet.radius, 0.2) * 0.5);
      const color = hex(planet.color, '#cccccc');
      const material = MATERIAL[planet.material] ?? MATERIAL.rock;
      const moons = planet.moons ?? [];

      tree.push(`  group.orbit#${oid} {`);
      tree.push(`    sphere.planet${bornClass(planet)}#${pid};`);
      rules.push(
        `#${oid} { translate: ${f(x)} 0 ${f(z)}; animation: orbit ${f(Math.max(2, n(planet.speed, 10)))}s linear infinite; }`,
        `#${pid} { translate: ${f(px)} 0 ${f(pz)}; radius: ${f(r)}; color: ${color}; material: ${material}; }`
      );

      if (planet.rings) {
        const rid = uid('r', planet);
        tree.push(`    torus.ring#${rid};`);
        rules.push(`#${rid} { translate: ${f(px)} 0 ${f(pz)}; rotate-x: 12deg; radius: ${f(r * 1.9)}; thickness: ${f(r * 0.08)}; color: ${color}; }`);
      }

      if (moons.length) {
        const mid = uid('m', planet);
        tree.push(`    group.moons#${mid} {`);
        rules.push(`#${mid} { translate: ${f(px)} 0 ${f(pz)}; animation: orbit 3s linear infinite reverse; }`);
        moons.forEach((moon, i) => {
          const id = uid('mo', moon);
          const ma = (i / moons.length) * Math.PI * 2;
          const md = r * 2.2 + i * 0.08;
          tree.push(`      sphere.moon${bornClass(moon)}#${id};`);
          rules.push(
            `#${id} { translate: ${f(Math.cos(ma) * md)} 0 ${f(Math.sin(ma) * md)}; ` +
            `radius: ${f(Math.max(0.03, n(moon.radius, 0.06) * 0.6))}; color: ${hex(moon.color, '#dddddd')}; }`
          );
        });
        tree.push(`    }`);
      }
      tree.push(`  }`);
    }
  }

  // Constellations: a closed outline around their stars, sorted by angle
  // around the center, so the beams never cross each other.
  let beam = 0;
  for (const c of constellations) {
    const points = (c.stars ?? []).map((s) => pos.get(s.documentId)).filter(Boolean);
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const cz = points.reduce((sum, [, z]) => sum + z, 0) / points.length;
    points.sort((a, b) => Math.atan2(a[1] - cz, a[0] - cx) - Math.atan2(b[1] - cz, b[0] - cx));
    const segments = points.length > 2 ? points.length : points.length - 1;
    for (let i = 0; i < segments; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[(i + 1) % points.length];
      const id = `b-${beam++}`;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const yaw = (-Math.atan2(z2 - z1, x2 - x1) * 180) / Math.PI;
      tree.push(`  cylinder.beam#${id};`);
      rules.push(
        `#${id} { translate: ${f((x1 + x2) / 2)} 0 ${f((z1 + z2) / 2)}; height: ${f(len)}; rotate-y: ${f(yaw)}deg; rotate-z: 90deg; }`
      );
    }
  }

  const background = hex(universe?.background, '#05050f');
  const glow = hex(universe?.glow, '#4945ff');
  const spin = n(universe?.spin, 0.2);

  return `@scene {
${tree.join('\n')}
}

scene {
  background: radial-gradient(circle, color-mix(in oklch, ${glow} 18%, ${background}), ${background});
  floor: none;
  camera-distance: 15;
  camera-angle: 20deg 35deg;
  camera-spin: ${spin > 0 ? `${f(60 / spin)}s` : 'none'};
  ambient: 0.25 ${glow};
  filter: bloom(0.6);
}

.planet, .moon { material: matte(); }
.beam { radius: 0.015; color: ${glow}; material: emissive(${glow}, 1.5); }
.ring { material: metal(0.3); }

${rules.join('\n')}

.born { animation: pop 0.9s cubic-bezier(.3, 1.6, .5, 1); }

@keyframes orbit {
  from { rotate-y: 0deg; }
  to { rotate-y: 360deg; }
}

@keyframes pop {
  0% { scale: 0.01; }
  55% { scale: 1.5; }
  80% { scale: 0.85; }
  100% { scale: 1; }
}
`;
}
