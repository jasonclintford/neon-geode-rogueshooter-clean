# Neon Geode Rogueshooter

A fast, neon drenched, procedurally generated, endless room shooter built as a static web game.

The included mood board is at `public/inspiration.png`.

## Expanded content snapshot
- 9 weapons with distinct firing profiles (hitscan-like laser feel, rockets, rail pierce, spread fans, etc.)
- 8 enemy archetypes with varied AI (chaser, strafer, sniper, turret, charger, bomber variants)
- Deterministic room events and themes (skirmish, swarm, gauntlet, cache, shrine, bosslet cadence)
- Deterministic hazards, loot, shrines/upgrades, and wave composition from `(runSeed, roomCoord)`
- Score streak multiplier, run progression stats, best score and best depth persistence
- Enhanced UI: minimap, upgrades panel, run seed/depth/kill/streak telemetry, pause + game-over overlays

## Controls
- Move: WASD or Arrow keys
- Aim: mouse
- Shoot: left mouse button (hold for auto weapons)
- Dash: Space
- Interact / pick up: E
- Pause: Esc

## Gameplay loop
Each run starts with a random seed. Rooms exist on an infinite grid. Exits lead to adjacent coordinates and generate new rooms on demand. Room generation, enemy spawns, and loot rolls are deterministic from the run seed and room coordinate.

## Tech
- Phaser 3 + Arcade Physics
- Vite + TypeScript
- Vitest for deterministic generation tests

## Run locally
```bash
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Build
```bash
npm run build
npm run preview
```

Preview serves the built game (default at `http://127.0.0.1:4173` when launched with `--port 4173`).

## Publish To GitHub + GitHub Pages
This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

1. Create an empty GitHub repository.
2. Push this project:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```
3. In GitHub: `Settings -> Pages -> Source`, select `GitHub Actions`.
4. Every push to `main` builds and deploys automatically.

The workflow sets Vite `BASE_PATH` to `/<repo-name>/`, so it works correctly on GitHub Pages project URLs.
