# Content Universe (front)

Strapi content drawn as a 3D galaxy with GSS.

1. `cp .env.example .env` and set `VITE_STRAPI_URL` (default: http://localhost:1337).
2. `npm install`
3. `npm run dev`

The page polls Strapi every 3 s. A new published entry pops in with the `.born` animation.
`src/to-gss.js` builds the GSS source; `mock-data.mjs` holds fake data to test it without Strapi.
