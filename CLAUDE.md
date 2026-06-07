# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A kid-friendly clock-reading practice toy. `index.html` holds the DOM scaffold + CSS; the game logic is split into ES modules under `src/`. There is no build step — modules load natively via `<script type="module" src="src/main.js">`.

**Running it: must be served over HTTP** (e.g. VS Code Live Server, `python -m http.server`, or `npx http-server`). ES modules don't load from `file://`.

A Playwright e2e suite (`package.json`, `playwright.config.js`, `tests/`) is the only Node dependency. The app itself has no runtime deps.

External resources: Google Fonts (Fraunces, Quicksand). State persists to `localStorage` under the key `clock-toy-gym` (last 20 session summaries only).

## Architecture

The app is structured as small modules around three patterns:

- **Strategy** — each play mode (`free`, `drill1`, `drill2`, `drill3`) is a plain object in `src/modes/` with the same shape: `{ key, name, icon, desc, timed, showsHint, showsDice, setup(store, round), targetText(round) }`. Adding a new mode is: create a new file, register it in `src/modes/index.js`. No other module needs to know about it — `if (MODE === 'drillX')` chains do not exist.
- **Observer** — `src/state.js` Store extends `EventEmitter`. Components subscribe to events (`hands:change`, `sliders:change`, `round:new`, etc.) rather than calling into each other directly. Wiring lives in `src/main.js`.
- **Repository** — `src/storage.js` `HistoryStore` wraps `localStorage` with a typed API (`load()`, `push(entry)`, `clear()`). Caller knows nothing about JSON or the storage backend.

Module layout:

```
src/
  config.js           — DIFFICULTIES, HOUR_COLORS, thresholds, ring constants
  events.js           — EventEmitter base class
  state.js            — Store (extends EventEmitter): MODE, DIFF, ROUND, STATE, session counters
  storage.js          — HistoryStore (Repository over localStorage)
  sky.js              — Sky: 24h gradient + sun arc + stars
  clock.js            — Clock: SVG build + renderHands + hand-drag
  sliders.js          — Sliders: rail build + knob drag + render
  modes/
    base.js           — Mode interface (documented contract) + formatTime helper
    free.js, drill1.js, drill2.js, drill3.js
    index.js          — MODES registry
  round.js            — RoundRunner: orchestrates round lifecycle, owns timer
  ui/
    pickers.js        — Mode + difficulty picker rendering & flow
    feedback.js       — Feedback panel + check/next/hint visibility
    stats.js          — Progress dots, timer bar, accuracy ring, latency, streak, dice
    summary.js        — End-of-session summary screen (writes to HistoryStore)
  main.js             — Composition root: instantiates modules, wires events, binds DOM
```

`index.html` (~605 lines) is just CSS + DOM scaffold + a single `<script type="module" src="src/main.js">`. No inline JS, no inline `onclick` handlers — `src/main.js` does all DOM event binding via `addEventListener`.

When changing behavior:
- New mode → new file in `src/modes/`, register in `src/modes/index.js`
- New round-flow rule → `src/round.js` (RoundRunner)
- New UI element → corresponding file in `src/ui/`
- Palette / thresholds / difficulty tuning → `src/config.js`
- New side effect on state change → subscribe to a Store event in `src/main.js`

The DOM is fixed in HTML; JS only fills inner content and toggles visibility/locked attributes.

## Quirky details worth knowing

- Back link in the header (`<a href="index.html">← Gyms</a>`) is a vestige from when this lived inside a larger collection. The filename used to be `clock-toy-gym.html`. Don't "fix" the link unless rewiring the multi-page setup.
- `window.__clock` is exposed at the bottom of `src/main.js` as a debug/verification hook (`STATE`, `ROUND`, `MODE`, `DIFF`, `applySky`). `src/main.js` also re-exposes `pickMode`, `pickDifficulty`, `renderHands`, `renderSlider` on `window` for the Playwright tests. Useful when driving the page from Chrome devtools.
- Tick labels around the outer ring read `5, 10, 15, ... 60` (not `0`) — this is intentional and the hint text in `FeedbackView.showHint` explains why. Don't change `60` → `0` without updating the hint.
- The moon is wired up in HTML and styles but currently unused (`Sky.apply` doesn't position it — sun walks the full 24-hour arc instead). Leave the moon scaffolding in place unless explicitly redesigning the sky cycle.
- Layout is a single column at all viewport widths. The DOM order is: header → progress/timer/stats (timed only) → dice/roll/target → action-row (Check + Next sit in this same flex row, but they're mutually exclusive — `#check-btn` hides when `#next-btn` shows) → feedback panel → clock → sliders.

## Conventions

- Vanilla JS, no framework, no bundler. ES modules only.
- Each module has a single responsibility (SRP). DOM lookups live in `src/main.js` and are passed into module constructors — modules don't `getElementById` themselves.
- Dependency injection by constructor: components take `{ store, els, ... }` rather than reaching for globals.
- Store mutations go through `store.setHandH()` / `setHandM()` / etc. so events fire. Don't mutate `store.STATE.handH` directly from outside the Store.
- CSS uses custom properties at `:root` for the palette. Re-use those tokens rather than hardcoding colors.
- No comments narrating "what" the code does — only non-obvious "why" (e.g. the sun-arc geometry, tick-label hint, the `:not([hidden])` workaround).

## Testing

Playwright e2e suite under `tests/`. Three spec files:

- `tests/picker.spec.js` — mode + difficulty pickers, visibility of timer/dice per mode.
- `tests/drills.spec.js` — all four modes (free, drill1, drill2, drill3) with correct + wrong answer flows. Includes one synthetic-pointerdown drag test that exercises the SVG hand-snap handler.
- `tests/session.spec.js` — 10-round sessions, summary screen, `localStorage` history (cap at 20), restart flows.

Tests drive the app via globals re-exposed on `window` from `src/main.js` (`pickMode`, `pickDifficulty`, `renderHands`, `renderSlider`) and the `window.__clock` debug hook. They do **not** rely on UI dragging by default — pointer events from Playwright's `page.mouse` don't reliably trigger the JS `pointermove` handler (Chromium synthesizes pointer events from CDP mouse input inconsistently). The drag test in `drills.spec.js` uses `dispatchEvent(new PointerEvent(...))` instead.

Commands:

```bash
npm install            # one-time
npx playwright install chromium   # one-time, downloads ~150MB browser binary
npm test               # runs all 27 tests, ~10s
npm run test:ui        # interactive UI mode
npm run test:headed    # watch the browser run
```

Playwright auto-starts a static server (`http-server` on port 5510) — does **not** conflict with VS Code Live Server on 5500. Server config lives in `playwright.config.js`.

If you change the app and add new behavior, add or update a spec rather than relying on manual browser testing.
