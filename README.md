# EMBERKEEPER — Light the Five Lanterns

An original lantern-light arena game for make.fun `best-game-01`. No libraries,
no network requests, no downloaded assets: every pixel is drawn in canvas and
every sound is synthesised with WebAudio.

## The story

Night has swallowed the garden. You are its last lantern keeper. Your flame is
both your health and your clock — it drains every second. Gather fireflies to
feed it, dodge the shadow wisps that eat it, and light all five stone lanterns
before the dark takes you. Light the fifth and dawn breaks: you win.

## How to play

| Control | What it does |
|---|---|
| WASD / Arrow keys | Move the keeper |
| Space | Dash (costs 8 flame, brief protection) |
| Enter / click | Start, restart |
| P / Esc | Pause / resume |
| R | Restart the night |
| 1 / 2 / 3 or click | Choose a blessing when a lantern is lit |
| M | Mute / unmute |

**Goal:** light all 5 lanterns. Stand close to a dark lantern and its ring fills —
step away and the light fades. Each lantern lit deepens the night (faster, more
wisps) and offers a choice of 3 blessings: Ember Heart, Swift Boots, Wide Glow,
Moth Magnet, Dash Ward.

**Score:** fireflies are worth 10 points times a combo multiplier (up to ×3) if
you keep collecting within 2.5 seconds; each lantern is 150 points; winning adds
a time bonus of 2 points per second under 3 minutes.

**Lose:** your flame reaches 0 — drained by time or eaten by wisps (18 flame a touch). **Win:** all five lanterns lit.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or open `game/index.html` through any static file server. `?seed=N` fixes the
night's pattern; `?shot=start|play|end|win&seed=N` stages a screenshot scene.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored `vendor/makefun-game.ts` library.

## Files

- `game/index.html` — the page, canvas only
- `game/src/main.js` — boot, the fixed-step loop, the six screens
- `game/src/world.js` — the rules: flame, fireflies, wisps, lanterns, blessings
- `game/src/levels.js` — the five lanterns, the five nights, the blessings
- `game/src/render.js` — all drawing: dusk garden, lantern light, HUD, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised sounds (WebAudio, no files)
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — the seeded generator behind `?seed=`
- `game/src/shots.js` — the autopilot that stages the screenshots
- `main.ts` — the hand-in program; `serve.ts` — the local static server

## License

MIT — see `LICENSE`.
