// "Big Bang" panel: creates a planet in Strapi from the front.
// Needs the Public role to have `create` on Planet (Settings > Users & Permissions).

const SHADING = {
  rock: 'none',
  metal: 'linear-gradient(160deg, #fff6 0%, transparent 40%, #0006 100%)',
  glass: 'radial-gradient(circle at 70% 75%, #fff4 0 18%, transparent 30%)',
  jelly: 'radial-gradient(circle at 50% 50%, transparent 55%, #fff3 75%, transparent 80%)',
  gold: 'linear-gradient(160deg, #fff3a0aa 0%, transparent 45%, #6b4a0066 100%)',
};

export function initPanel(api) {
  const toggle = document.querySelector('#bigbang-toggle');
  const form = document.querySelector('#bigbang');
  const preview = form.querySelector('.preview');
  const status = form.querySelector('.status');
  const starSelect = form.elements.star;

  toggle.addEventListener('click', () => {
    const open = form.hidden;
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) form.elements.name.focus();
  });

  // Keep the star list in sync with what Strapi returns at each poll.
  window.addEventListener('universe:data', ({ detail }) => {
    const current = starSelect.value;
    const options = detail.stars.map((s) => `<option value="${s.documentId}">${s.name}</option>`).join('');
    if (starSelect.dataset.options !== options) {
      starSelect.innerHTML = options;
      starSelect.dataset.options = options;
      if (current) starSelect.value = current;
    }
  });

  // Live CSS preview of the planet while you edit.
  function render() {
    const { color, material, radius, orbit, speed, rings } = form.elements;
    form.elements.radiusOut.value = Number(radius.value).toFixed(2);
    form.elements.orbitOut.value = Number(orbit.value).toFixed(1);
    form.elements.speedOut.value = speed.value;
    preview.style.setProperty('--c', color.value);
    preview.style.setProperty('--size', `${24 + Number(radius.value) * 80}px`);
    preview.style.setProperty('--shade', SHADING[material.value]);
    preview.classList.toggle('has-rings', rings.checked);
  }
  form.addEventListener('input', render);
  render();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const f = form.elements;
    const data = {
      name: f.name.value.trim(),
      star: f.star.value,
      color: f.color.value,
      material: f.material.value,
      radius: Number(f.radius.value),
      orbit: Number(f.orbit.value),
      speed: Number(f.speed.value),
      rings: f.rings.checked,
    };

    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Igniting…';
    try {
      const res = await fetch(`${api}/planets?status=published`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? res.status);
      status.textContent = `${data.name} is in orbit. See it in the admin too.`;
      f.name.value = '';
      window.dispatchEvent(new Event('universe:refresh'));
    } catch (err) {
      status.textContent =
        String(err.message).includes('403') || /forbidden/i.test(err.message)
          ? 'Strapi says no: give the Public role "create" on Planet.'
          : `Error: ${err.message}`;
    } finally {
      form.removeAttribute('aria-busy');
    }
  });
}
