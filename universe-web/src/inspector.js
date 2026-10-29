// Hover inspector: shows the Strapi entry behind the shape under the pointer.
//
// GSS does not expose hover events, but it sets canvas.style.cursor from the
// `cursor` of the hovered shape. We give each shape a unique cursor value
// (an invalid data: image, then `pointer` as fallback), and watch the style.

let leaves = [null];

export function tagCursors(compiled, nextLeaves) {
  leaves = nextLeaves;
  for (const c of compiled.cursors ?? []) {
    if (!leaves[c.id]) continue;
    c.hover = c.active = `url("data:,leaf-${c.id}"), pointer`;
  }
  return compiled;
}

const HIDDEN = new Set(['id', 'createdAt', 'updatedAt', 'locale', 'localizations']);

// Nested relations become short summaries, so the card stays readable.
function clean(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (HIDDEN.has(k)) continue;
    if (Array.isArray(v)) out[k] = v.length ? v.map((x) => x.name ?? x.documentId) : [];
    else out[k] = v;
  }
  return out;
}

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function highlight(json) {
  return esc(json).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g,
    (m, str, colon, lit) => {
      if (str && colon) return `<span class="k">${str}</span>${colon}`;
      if (str) {
        const swatch = /^"#[0-9a-f]{6}"$/i.test(str) ? `<i style="--c:${str.slice(1, -1)}"></i>` : '';
        return `${swatch}<span class="s">${str}</span>`;
      }
      if (lit) return `<span class="l">${m}</span>`;
      return `<span class="n">${m}</span>`;
    }
  );
}

export function initInspector(canvas, strapiUrl) {
  const card = document.createElement('aside');
  card.id = 'inspector';
  card.hidden = true;
  document.body.append(card);

  let current = 0;

  function show(id) {
    if (id === current) return;
    current = id;
    const entry = leaves[id];
    if (!entry) {
      card.hidden = true;
      return;
    }
    const { uid, doc } = entry;
    const type = uid.split('.').pop();
    const json = JSON.stringify(clean(doc), null, 2);
    card.innerHTML = `
      <header>
        <span class="badge">${type}</span>
        <strong>${esc(doc.name ?? doc.documentId)}</strong>
      </header>
      <code class="uid">${uid}</code>
      <pre>${highlight(json)}</pre>
      <footer>Click to open in the Strapi admin ↗</footer>`;
    card.hidden = false;
    place();
  }

  new MutationObserver(() => {
    const m = /leaf-(\d+)/.exec(canvas.style.cursor);
    show(m ? Number(m[1]) : 0);
  }).observe(canvas, { attributes: true, attributeFilter: ['style'] });

  // Keep the card next to the pointer and inside the window.
  let pointer = [0, 0];
  function place() {
    const [px, py] = pointer;
    const pad = 18;
    const w = card.offsetWidth || 320;
    const h = card.offsetHeight || 200;
    const x = px + pad + w > innerWidth ? px - pad - w : px + pad;
    const y = Math.min(py + pad, innerHeight - h - 8);
    card.style.translate = `${Math.max(8, x)}px ${Math.max(8, y)}px`;
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer = [e.clientX, e.clientY];
    place();
  });

  canvas.addEventListener('pointerleave', () => show(0));

  // A click (not a drag) opens the entry in the admin.
  let down = null;
  canvas.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  canvas.addEventListener('pointerup', (e) => {
    const entry = leaves[current];
    if (!entry || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const url = `${strapiUrl}/admin/content-manager/collection-types/${entry.uid}/${entry.doc.documentId}`;
    window.open(url, '_blank', 'noopener');
  });
}
