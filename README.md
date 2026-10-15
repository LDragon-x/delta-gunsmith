# delta-gunsmith

Attachment (gunsmith) build optimizer for Delta Force (三角洲行动), as a static React web app.
Given a weapon, a stat-priority preset, and an in-game currency budget, it recommends the top-3
attachment combinations by weighted panel stats, with market prices and a score-per-10k-coins
efficiency metric.

**Live data snapshot:** 68 weapons · 577 attachments · 556 market-price entries
(weapon/attachment stats compiled from the community dfttk data layer, 2026-09-11; market prices 2026-09-24).

## How it works

```
src/data/gunsmith.json   weapon base stats, attachment mods/mults, market prices
src/lib/optimizer.ts     beam search (width 60) over attachment slots
src/App.tsx              three-pane UI: weapon list / base stats / build recommendations
```

- **Slot inference** — a weapon's attachment slots are derived from the compatibility table
  (`attachments[].weapons`), not hardcoded per weapon.
- **Stat model** — each attachment applies flat `mods` (panel points) and percentage `mults`
  to the weapon's five official panel stats (range / recoil control / hip-fire accuracy /
  handling / stability, 0–100).
- **Search** — per-slot beam search keeps the top-60 partial builds by weighted score;
  leaving a slot empty is always one of the candidates, and a budget cap prunes over-budget
  branches as early as possible. Final candidates are deduplicated by part combination.
- **Presets** — four weighting profiles (recoil control / mobility / hip-fire / balanced).

The optimizer is a TypeScript port of an earlier Python prototype used during data validation.

## Quickstart

```bash
npm ci
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # exhaustive 68-weapons x 4-presets smoke test + optimizer assertions (Node >= 22.18)
npm run build      # type-check + production build to dist/
```

## Tests

- `test_all_weapons.mjs` — runs the optimizer over every weapon × preset and fails on any
  crash or empty recommendation set.
- `tests/optimizer.test.mjs` — assertion tests for the properties that matter: budget
  feasibility, score monotonicity vs. the bare gun, dedup of recommended builds, and
  preset-goal sanity. Both run on plain Node (TypeScript via built-in type stripping).

## Data provenance & disclaimer

Game data belongs to its respective rights holders (TiMi / Tencent). The JSON snapshot is a
community-compiled dataset used here for personal learning and portfolio purposes; this
project is not affiliated with or endorsed by the game's publisher. The market prices are
a point-in-time snapshot and will go stale.

## Development notes

Built with React 19, TypeScript, Vite 7, Tailwind CSS 3, and shadcn/ui (Radix primitives).
UI text is in Simplified Chinese, matching the game's community language.

**AI collaboration disclosure:** like its companion project
[delta-audio-radar](https://github.com/LDragon-x/delta-audio-radar), this project was developed interactively with an
AI coding assistant (Kimi). The author directed all product decisions, data validation, and
iterative debugging; generated code was reviewed and tested before acceptance.
