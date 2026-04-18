# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server at http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

No lint or test setup exists. Validate changes by running `npm run build` — a clean build confirms no import/syntax errors.

## What this is

A browser-based quiz game engine modeled after the Japanese TV show "ネプリーグ トロッコアドベンチャー". Players answer binary (left/right) questions while riding a trolley through 3 stages. Wrong answer = trolley falls. Designed for live event use (projector/screen).

## Architecture

**Entry point**: `main.js` (root) — `TrolleyAdventure` class owns the full state machine.

**State machine** (`GameState`):
`TITLE → QUESTION → JUDGING → SUSPENSE → REVEAL → (INTERMISSION) → QUESTION ... → RESULT / GAMEOVER`

All timed transitions go through `DirectorQueue` (cancellable setTimeout chain). Call `director.cancel()` before any state reset.

**Module responsibilities** (`src/modules/`):
- `SceneManager` — Canvas background renderer. Loads PNG images from `/public/assets/background/{cave,jungle,temple}_bg.png`. Falls back to blank canvas if images missing. Exposes `setTheme(name)`, `speed`, `shake`.
- `SoundEngine` — Web Audio API only (no audio files). Procedural BGM + all SE. Must call `ensureRunning()` inside a user-gesture handler before any audio plays (AudioContext autoplay policy).
- `DirectorQueue` — `play([{wait, fn},...])` / `cancel()`. Token-based so stale callbacks self-abort.
- `TelopSystem` — Appends `.telop` divs to `#telop-stack`. Max 4 stacked.
- `Narrator` — Typewriter effect via CSS `clip-path: inset(... var(--typed) ...)` to avoid CJK reflow. Mouth-flap animation while speaking.
- `PanelistBox` — 4 panelist cards at bottom-left. `reactAll(emotion)` triggers CSS animation via `data-emotion` attribute.
- `PrizeHUD` — Score/rank display (銅/銀/金). `registerAnswer(isCorrect)` updates value + streak.

**Data files** (`src/data/`):
- `telop_lines.js` — Text + CSS variant for each game event.
- `narrator_lines.js` — Arrays of Japanese narrator strings, `{n}/{side}/{s}` token substitution.
- `panelists.js` — 4 panelist definitions with per-emotion emoji.

**Question data**: `public/assets/data/questions.json` — loaded at runtime. If `localStorage['trolley_questions']` exists it takes priority (set by the editor at `/editor.html`).

## Key conventions

- No framework — vanilla JS ES modules, Vite for bundling only.
- All new DOM layers go inside `#app` as absolutely-positioned siblings. z-index ladder: canvas=1, hud=10, panelists/prize=15, studio-lights=20, telops=180, narrator=190, judge-overlay=200, stage-card=220, overlay=230.
- Background images are expected at `/public/assets/background/` and `/public/assets/trolley/trolley.png`. Missing images cause SceneManager to skip drawing (no crash).
- `SoundEngine` is purely procedural — no external audio files. All sounds are synthesized via OscillatorNode, BufferSource (noise), and BiquadFilterNode.
- Stage boundaries: Q1–3 = `cave`, Q4–6 = `jungle`, Q7–10 = `temple`. `updateStage()` in `main.js` maps `currentIndex` to theme names.

## Editor

`/editor.html` — standalone page, no JS imports. Loads questions JSON into a raw `<textarea>`, validates JSON on save, writes to `localStorage['trolley_questions']`. Game reads this key on startup and uses it over the default file.
