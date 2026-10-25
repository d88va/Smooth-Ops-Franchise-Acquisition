# Franchise Partner Engine

Static, client-side app (React + Vite + TypeScript + Tailwind). No backend, no login, no runtime API calls: everything, including fonts and the Karnataka outline, is bundled.

```bash
npm install
npm run dev        # local
npm test           # engine invariants, parser, query tests
npm run build      # outputs dist/ (static; deploy anywhere)
npm run sample     # regenerates public/sample-applications.xlsx
```

## Where things are
- `src/engine/` the decision engine (pure, deterministic, no UI imports). `config.ts` holds every threshold and weight (the assumptions list for the deck).
  - `parse.ts` tolerant xlsx reader · `evaluate.ts` gates + scoring · `allocate.ts` allocation, one-pin rule, overrides · `counterfactual.ts` "flips to Approved if…" · `plan.ts` next steps and training plan · `diff.ts` before/after
- `src/query/parse.ts` rule-based intent parser (no AI at runtime)
- `src/state/store.ts` baseline, current state, scenario log, undo
- `src/data/` existing stores, city geometry, sample data, Karnataka outline

## Deploy
Any static host works: `npm run build`, then publish `dist/` (Vercel, Netlify, Cloudflare Pages, GitHub Pages). `base` is `./`, so it also works from a sub-path.

## Honest assumptions
- Pin positions are approximate (city centre + deterministic offset from the last 3 digits). Distance and cannibalisation use pin-space proximity, not road distance.
- Thresholds and weights in `config.ts` are proposed defaults, not validated against real franchise data.
- The Karnataka outline is hand-simplified for visualisation.
