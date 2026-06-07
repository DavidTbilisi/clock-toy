# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, zero-dependency static web app — a kid-friendly clock-reading practice toy. Everything (HTML, CSS, inline JS) lives in `index.html` (~1300 lines). There is no build step, no package manager, no test suite, no server. To run it, open `index.html` in a browser, or serve the directory with any static server (e.g. `python -m http.server`).

The only external resource is Google Fonts (Comic Neue, Nunito); the app works offline aside from font fallback.

State persists to `localStorage` under the key `clock-toy-gym` (last 20 session summaries only).

## Architecture (single file, but with distinct sections)

`index.html` is structured as: CSS in `<style>` (lines 10–374) → DOM scaffold in `<body>` (376–487) → game logic in `<script>` (489–1303). Within the script, sections are delimited by `// ═══` banner comments — read those when navigating:

- **Config (`CFG`)** — modes and difficulties drive almost everything. `CFG.modes` defines four play modes (`free`, `drill1` set-the-clock, `drill2` read-the-clock, `drill3` build-from-sliders); `CFG.difficulties` defines `easy`/`medium`/`hard` (timer length, plateau target, `minuteStep` granularity, and `hourDrift` — whether the hour hand drifts continuously between hour marks).
- **State** — `MODE`, `DIFF`, `ROUND`, and `STATE` (with `freshState()`) hold the current session. `STATE.locked` flags which of the four inputs (hand-hour, hand-minute, slider-hour, slider-minute) are read-only for the current drill. Drills `drill2`/`drill3` lock one pair and ask the player to fill in the other; `drill1` and `free` leave everything draggable.
- **Sky module** — `SKY_STOPS` is a 24-hour gradient keyframe table; `skyForTime(h, m)` interpolates between stops and computes sun position along an arc (`arcCoords`). `applySky()` mutates `document.body.style.background` and the sun/moon/stars layers. In `free` mode, sky updates live from the dragged hands (`applySkyFromState`); in timed drills it tracks the target round time (`applySkyFromRound`).
- **Clock SVG** — `buildClock()` constructs the face programmatically (60 ticks, 12 hour bubbles colored by `HOUR_COLORS`, two hands, pivot). `hourDisplayAngle()` handles `hourDrift` math (hard mode bleeds minute progress into hour-hand angle). `renderHands()` is the cheap re-render path called after every drag tick.
- **Input — hand drag** (`attachHandDrag`) and **input — sliders** (`attachSliders`) — both use pointer events with `setPointerCapture`. They respect `STATE.locked.*` and snap to `CFG.difficulties[DIFF].minuteStep` for the minute hand. Clicking empty clock face picks the nearest unlocked hand and follows.
- **Round flow** — `nextTarget()` → `newRound()` → user input → `checkAnswer()` (compares unlocked inputs only) → `showFeedback()` → `nextRound()` → eventually `showSummary()` (writes localStorage). Timed modes use a 100ms `setInterval` (`tick`) that drives a colored timer bar and triggers `onTimeout` when it hits zero.

When changing rules or visuals, the right entry point is almost always `CFG` (for behavior knobs) or the relevant `// ═══` section (for rendering/interaction). The DOM is fixed in HTML; JS only fills inner content and toggles visibility/locked attributes.

## Quirky details worth knowing

- Back link in the header (`<a href="index.html">← Gyms</a>`, line 417) is a vestige from when this lived inside a larger collection. The filename used to be `clock-toy-gym.html` (see recent commit history). Don't "fix" the link unless rewiring the multi-page setup.
- `window.__clock` is exposed at the bottom of the script as a debug/verification hook (`STATE`, `ROUND`, `MODE`, `DIFF`, `applySky`). Useful when driving the page from Chrome devtools or browser-automation MCP tools.
- Tick labels around the outer ring read `5, 10, 15, ... 60` (not `0`) — this is intentional and the hint text in `showHint()` explains why. Don't change `60` → `0` without updating the hint.
- The moon is wired up in HTML and styles but currently unused (`skyForTime` always sets `moonVisible = false` — sun walks the full 24-hour arc instead). Leave the moon scaffolding in place unless explicitly redesigning the sky cycle.

## Conventions

- Vanilla JS, no framework, no modules — single global scope inside the `<script>` block. New helpers go inside the appropriate `// ═══` section; keep that banner structure intact.
- CSS uses custom properties at `:root` (lines 11–29) for the palette. Re-use those tokens rather than hardcoding colors.
- No comments narrating "what" the code does — match the existing style and only comment non-obvious "why" (see e.g. the sun-arc and tick-label comments).
