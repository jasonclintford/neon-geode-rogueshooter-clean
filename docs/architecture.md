# Architecture

## High level flow
The game uses Phaser scenes:
- BootScene: sets scaling and basic configuration
- PreloadScene: loads minimal assets (the rest are procedurally generated textures)
- GameScene: gameplay simulation, physics, procedural rooms, pickups
- UIScene: UI overlay, minimap, score, health, weapon display

## Deterministic generation
A run is defined by a `runSeed` and the current room coordinate `(rx, ry)`.
Deterministic RNG uses a small fast PRNG (mulberry32) wrapped in a `RngStream` that can be split into named substreams.
For each room:
- base stream = hash(runSeed, rx, ry)
- derived substreams: layout, enemies, loot, decoration
This ensures changes to, for example, decoration do not affect enemy rolls.

## Room model
Rooms are rectangles with a border wall collider and internal obstacles.
Exits are at the room edges; doors open when all enemies are cleared.
The minimap tracks visited coordinates.

## Weapons
Weapons are data driven:
- fireRateMs
- spreadDeg
- pellets
- projectileSpeed
- damage
- knockback
- ammo, reloadMs
- onHitFx profile

## Special FX
Use a dedicated EffectsSystem with:
- pooled particle emitters
- pooled impact sprites
- camera shake and flash
- additive blend bullet trails

## Performance
- Use Arcade Physics groups with pooling for bullets, enemy projectiles, and pickups.
- Avoid creating Graphics every frame. Pre generate textures once per run.
