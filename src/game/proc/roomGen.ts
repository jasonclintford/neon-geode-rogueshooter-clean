import { Tuning } from "../tuning";
import type { RoomCoord } from "../types";
import { mixSeed } from "../utils/hash";
import { RngStream } from "../utils/rng";
import { rollRoomLoot } from "./lootGen";
import { generateEnemyWave, rollRoomEvent, type EnemySpawnPlan, type RoomEvent } from "./waveGen";

export type Rect = { x: number; y: number; w: number; h: number };

export type RoomTheme = "azurite" | "magmatic" | "violet" | "teal";

export type HazardPlan = {
  kind: "pulse" | "ember";
  x: number;
  y: number;
  radius: number;
  damage: number;
  periodMs: number;
  phaseMs: number;
};

export type DecorationKind =
  | "crystalSmall"
  | "crystalTall"
  | "pillar"
  | "rune"
  | "spike";

export type DecorationPlan = {
  kind: DecorationKind;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  rotation: number;
};

export type RoomLayout = {
  coord: RoomCoord;
  seed: number;
  theme: RoomTheme;
  event: RoomEvent;
  obstacles: Rect[];
  hazards: HazardPlan[];
  decorations: DecorationPlan[];
  exits: { n: boolean; s: boolean; w: boolean; e: boolean };
  enemyPlan: EnemySpawnPlan[];
  weaponDrop: { id: string; x: number; y: number } | null;
  ammoDrop: { amount: number; x: number; y: number } | null;
  healthDrop: { amount: number; x: number; y: number } | null;
  shrine: { x: number; y: number; upgradeId: string } | null;
  portal: { x: number; y: number; target: RoomCoord } | null;
};

const W = Tuning.room.width;
const H = Tuning.room.height;

export function generateRoomLayout(
  runSeed: number,
  coord: RoomCoord,
  depth: number,
  ownedUpgrades: readonly string[] = []
): RoomLayout {
  const seed = mixSeed(runSeed, coord.x, coord.y);
  const themeRng = new RngStream(mixSeed(seed, "theme"));
  const layoutRng = new RngStream(mixSeed(seed, "layout"));
  const eventRng = new RngStream(mixSeed(seed, "event"));
  const enemyRng = new RngStream(mixSeed(seed, "enemies"));
  const lootRng = new RngStream(mixSeed(seed, "loot"));
  const hazardRng = new RngStream(mixSeed(seed, "hazards"));
  const decorRng = new RngStream(mixSeed(seed, "decor"));
  const portalRng = new RngStream(mixSeed(seed, "portal"));

  const theme = rollTheme(themeRng, depth);
  const event = rollRoomEvent(eventRng, depth);
  const obstacles = generateObstacles(layoutRng, depth);
  const hazards = generateHazards(hazardRng, depth, obstacles, event);
  const decorations = generateDecorations(decorRng, obstacles, hazards, theme, depth);
  const enemyPlan = generateEnemyWave(enemyRng, depth, obstacles, event);
  const loot = rollRoomLoot(lootRng, depth, event, obstacles, ownedUpgrades);
  const portal = generatePortal(portalRng, coord, depth, obstacles, hazards, event);

  return {
    coord,
    seed,
    theme,
    event,
    obstacles,
    hazards,
    decorations,
    exits: { n: true, s: true, w: true, e: true },
    enemyPlan,
    weaponDrop: loot.weaponDrop,
    ammoDrop: loot.ammoDrop,
    healthDrop: loot.healthDrop,
    shrine: loot.shrine,
    portal
  };
}

function rollTheme(rng: RngStream, depth: number): RoomTheme {
  const r = rng.next();
  if (depth % 5 === 0 && depth > 0) return "magmatic";
  if (r < 0.26) return "azurite";
  if (r < 0.49) return "teal";
  if (r < 0.74) return "violet";
  return "magmatic";
}

function generateObstacles(rng: RngStream, depth: number): Rect[] {
  const count = rng.int(Tuning.room.obstacleCountMin + 2, Tuning.room.obstacleCountMax + 8);
  const out: Rect[] = [];
  const padding = Tuning.room.obstaclePadding;
  const centerClear = 220;

  for (let i = 0; i < count * 2; i++) {
    if (out.length >= count) break;
    const wideChance = rng.chance(0.3 + Math.min(0.18, depth * 0.01));
    const w = wideChance ? rng.int(180, 340) : rng.int(60, 190);
    const h = wideChance ? rng.int(34, 120) : rng.int(52, 170);
    const x = rng.int(padding, W - padding - w);
    const y = rng.int(padding, H - padding - h);
    const rect = { x, y, w, h };

    if (collidesCircle(rect, W * 0.5, H * 0.5, centerClear)) continue;
    if (blocksEntryLane(rect)) continue;
    if (overlapsAny(rect, out, 14)) continue;
    out.push(rect);
  }

  // Add a few decorative pillars near edges.
  const edgePillars = rng.int(1, 4);
  for (let i = 0; i < edgePillars; i++) {
    const horizontal = rng.chance(0.5);
    const w = horizontal ? rng.int(88, 180) : rng.int(28, 56);
    const h = horizontal ? rng.int(28, 56) : rng.int(88, 180);
    const x = horizontal ? rng.int(76, W - 76 - w) : rng.chance(0.5) ? 52 : W - 52 - w;
    const y = horizontal ? (rng.chance(0.5) ? 52 : H - 52 - h) : rng.int(76, H - 76 - h);
    const rect = { x, y, w, h };
    if (!overlapsAny(rect, out, 10) && !blocksEntryLane(rect)) out.push(rect);
  }

  return out;
}

function generateHazards(
  rng: RngStream,
  depth: number,
  obstacles: readonly Rect[],
  event: RoomEvent
): HazardPlan[] {
  const hazards: HazardPlan[] = [];
  let count = rng.int(0, Math.min(5, 1 + Math.floor(depth / 4)));
  if (event === "gauntlet") count += 1;
  if (event === "cache" || event === "shrine") count = Math.max(0, count - 1);

  for (let i = 0; i < count; i++) {
    const p = randomHazardPoint(rng, obstacles);
    const pulse = rng.chance(0.65);
    hazards.push({
      kind: pulse ? "pulse" : "ember",
      x: p.x,
      y: p.y,
      radius: pulse ? rng.int(28, 42) : rng.int(22, 34),
      damage: pulse ? 1 : 2,
      periodMs: pulse ? rng.int(1000, 1650) : rng.int(1800, 2500),
      phaseMs: rng.int(0, 1200)
    });
  }

  return hazards;
}

function generateDecorations(
  rng: RngStream,
  obstacles: readonly Rect[],
  hazards: readonly HazardPlan[],
  theme: RoomTheme,
  depth: number
): DecorationPlan[] {
  const decor: DecorationPlan[] = [];
  const base = rng.int(34, 64);
  const extraByDepth = Math.min(30, Math.floor(depth * 1.5));
  const count = base + extraByDepth;

  for (let i = 0; i < count; i++) {
    const p = randomDecorPoint(rng, obstacles, hazards);
    const kind = rollDecorationKind(rng, theme);
    decor.push({
      kind,
      x: p.x,
      y: p.y,
      scale: rng.float(0.68, 1.48),
      alpha: rng.float(0.45, 0.95),
      rotation: rng.float(-0.15, 0.15)
    });
  }

  return decor;
}

function generatePortal(
  rng: RngStream,
  coord: RoomCoord,
  depth: number,
  obstacles: readonly Rect[],
  hazards: readonly HazardPlan[],
  event: RoomEvent
): { x: number; y: number; target: RoomCoord } | null {
  const chanceBase = 0.1 + Math.min(0.22, depth * 0.008);
  const chance = event === "cache" ? chanceBase + 0.12 : event === "bosslet" ? chanceBase + 0.04 : chanceBase;
  if (!rng.chance(Math.min(0.42, chance))) return null;

  const p = randomDecorPoint(rng, obstacles, hazards);
  let dx = rng.int(-3, 3);
  let dy = rng.int(-3, 3);
  if (dx === 0 && dy === 0) dx = rng.chance(0.5) ? 2 : -2;

  // Keep jumps meaningful and avoid tiny 1-step teleports too often.
  if (Math.abs(dx) + Math.abs(dy) < 2) {
    if (Math.abs(dx) > Math.abs(dy)) dx += dx >= 0 ? 1 : -1;
    else dy += dy >= 0 ? 1 : -1;
  }

  return {
    x: p.x,
    y: p.y,
    target: { x: coord.x + dx, y: coord.y + dy }
  };
}

function rollDecorationKind(rng: RngStream, theme: RoomTheme): DecorationKind {
  const r = rng.next();
  if (theme === "magmatic") {
    if (r < 0.26) return "spike";
    if (r < 0.52) return "crystalTall";
    if (r < 0.72) return "pillar";
    if (r < 0.88) return "crystalSmall";
    return "rune";
  }
  if (theme === "violet") {
    if (r < 0.32) return "rune";
    if (r < 0.56) return "crystalTall";
    if (r < 0.74) return "crystalSmall";
    if (r < 0.88) return "pillar";
    return "spike";
  }
  if (theme === "teal") {
    if (r < 0.36) return "crystalSmall";
    if (r < 0.58) return "rune";
    if (r < 0.78) return "crystalTall";
    if (r < 0.92) return "pillar";
    return "spike";
  }

  if (r < 0.3) return "crystalSmall";
  if (r < 0.56) return "crystalTall";
  if (r < 0.78) return "pillar";
  if (r < 0.9) return "rune";
  return "spike";
}

function randomDecorPoint(
  rng: RngStream,
  obstacles: readonly Rect[],
  hazards: readonly HazardPlan[]
): { x: number; y: number } {
  for (let i = 0; i < 48; i++) {
    const x = rng.int(72, W - 72);
    const y = rng.int(72, H - 72);
    const cdx = x - W * 0.5;
    const cdy = y - H * 0.5;
    if (cdx * cdx + cdy * cdy < 130 * 130) continue;

    let blocked = false;
    for (const o of obstacles) {
      if (x >= o.x - 14 && x <= o.x + o.w + 14 && y >= o.y - 14 && y <= o.y + o.h + 14) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    for (const h of hazards) {
      const dx = x - h.x;
      const dy = y - h.y;
      if (dx * dx + dy * dy < (h.radius + 22) * (h.radius + 22)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    return { x, y };
  }
  return { x: W * 0.5 + 140, y: H * 0.5 + 80 };
}

function randomHazardPoint(rng: RngStream, obstacles: readonly Rect[]): { x: number; y: number } {
  for (let i = 0; i < 42; i++) {
    const x = rng.int(96, W - 96);
    const y = rng.int(92, H - 92);
    const dx = x - W * 0.5;
    const dy = y - H * 0.5;
    if (dx * dx + dy * dy < 110 * 110) continue;
    let blocked = false;
    for (const o of obstacles) {
      if (x >= o.x - 20 && x <= o.x + o.w + 20 && y >= o.y - 20 && y <= o.y + o.h + 20) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return { x, y };
  }
  return { x: W * 0.5 + 120, y: H * 0.5 };
}

function overlapsAny(a: Rect, arr: readonly Rect[], pad: number): boolean {
  for (const b of arr) {
    if (
      a.x < b.x + b.w + pad &&
      a.x + a.w + pad > b.x &&
      a.y < b.y + b.h + pad &&
      a.y + a.h + pad > b.y
    ) return true;
  }
  return false;
}

function blocksEntryLane(r: Rect): boolean {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const laneHalf = 180;
  const topLane = r.y < 140 && r.x < cx + laneHalf && r.x + r.w > cx - laneHalf;
  const bottomLane = r.y + r.h > H - 140 && r.x < cx + laneHalf && r.x + r.w > cx - laneHalf;
  const leftLane = r.x < 150 && r.y < cy + laneHalf && r.y + r.h > cy - laneHalf;
  const rightLane = r.x + r.w > W - 150 && r.y < cy + laneHalf && r.y + r.h > cy - laneHalf;
  return topLane || bottomLane || leftLane || rightLane;
}

function collidesCircle(rect: Rect, cx: number, cy: number, radius: number): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
