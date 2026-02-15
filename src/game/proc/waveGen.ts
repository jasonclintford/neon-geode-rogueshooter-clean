import { Enemies, type EnemyDef } from "../data/enemies";
import { Tuning } from "../tuning";
import { RngStream } from "../utils/rng";

export type RectLike = { x: number; y: number; w: number; h: number };

export type RoomEvent =
  | "skirmish"
  | "swarm"
  | "gauntlet"
  | "cache"
  | "shrine"
  | "bosslet";

export type EnemySpawnPlan = {
  id: string;
  x: number;
  y: number;
  elite: boolean;
};

const W = Tuning.room.width;
const H = Tuning.room.height;

const EVENT_WEIGHT: Record<Exclude<RoomEvent, "bosslet">, number> = {
  skirmish: 44,
  swarm: 24,
  gauntlet: 16,
  cache: 8,
  shrine: 8
};

const EVENT_BUDGET_MULT: Record<RoomEvent, number> = {
  skirmish: 1,
  swarm: 1.3,
  gauntlet: 1.55,
  cache: 0.8,
  shrine: 0.74,
  bosslet: 1.9
};

export function rollRoomEvent(rng: RngStream, depth: number): RoomEvent {
  if (depth > 0 && depth % 6 === 0) return "bosslet";
  const pool = Object.entries(EVENT_WEIGHT) as Array<[Exclude<RoomEvent, "bosslet">, number]>;
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.float(0, total);
  for (const [event, weight] of pool) {
    r -= weight;
    if (r <= 0) return event;
  }
  return "skirmish";
}

export function generateEnemyWave(
  rng: RngStream,
  depth: number,
  obstacles: readonly RectLike[],
  event: RoomEvent
): EnemySpawnPlan[] {
  const plan: EnemySpawnPlan[] = [];
  const available = Enemies.filter(enemy => enemy.minDepth <= depth);
  if (available.length === 0) return plan;

  const baseBudget = 7 + depth * 1.9;
  let budget = baseBudget * EVENT_BUDGET_MULT[event];
  const maxCount = Math.min(34, 8 + Math.floor(depth * 1.6));

  while (budget > 0.75 && plan.length < maxCount) {
    const enemy = pickEnemyByWeight(rng, available, depth, event);
    const eliteChance = Math.min(0.08 + depth * 0.012, 0.4);
    const elite = event === "bosslet" ? rng.chance(0.45) : rng.chance(eliteChance);
    const threat = enemy.threat * (elite ? 1.9 : 1);
    if (threat > budget && plan.length >= 4) break;

    const p = randomSpawnPoint(rng, obstacles, 130);
    plan.push({ id: enemy.id, x: p.x, y: p.y, elite });
    budget -= threat;
  }

  if (event === "bosslet" && !plan.some(e => e.id === "oracle" || e.id === "brute")) {
    const fallbackId = depth >= 9 ? "oracle" : "brute";
    const p = randomSpawnPoint(rng, obstacles, 130);
    plan.push({ id: fallbackId, x: p.x, y: p.y, elite: true });
  }

  return plan;
}

function pickEnemyByWeight(
  rng: RngStream,
  enemies: readonly EnemyDef[],
  depth: number,
  event: RoomEvent
): EnemyDef {
  const weighted = enemies.map(enemy => {
    const depthDelta = Math.max(0, depth - enemy.minDepth);
    let weight = Math.max(4, 42 - enemy.threat * 8 + depthDelta * 2.8);
    if (event === "swarm" && (enemy.ai === "chaser" || enemy.ai === "strafer")) weight *= 1.25;
    if (event === "gauntlet" && enemy.ai === "turret") weight *= 1.35;
    if (event === "cache" && enemy.ai === "chaser") weight *= 1.1;
    if (event === "bosslet" && enemy.threat > 2.5) weight *= 1.5;
    return { enemy, weight };
  });

  const total = weighted.reduce((sum, x) => sum + x.weight, 0);
  let r = rng.float(0, total);
  for (const x of weighted) {
    r -= x.weight;
    if (r <= 0) return x.enemy;
  }
  return weighted[weighted.length - 1].enemy;
}

function randomSpawnPoint(
  rng: RngStream,
  obstacles: readonly RectLike[],
  clearRadius: number
): { x: number; y: number } {
  for (let i = 0; i < 50; i++) {
    const x = rng.int(100, W - 100);
    const y = rng.int(92, H - 92);
    if (pointBlocked(x, y, obstacles, clearRadius)) continue;
    return { x, y };
  }
  return { x: W * 0.5, y: H * 0.5 };
}

function pointBlocked(
  x: number,
  y: number,
  obstacles: readonly RectLike[],
  clearRadius: number
): boolean {
  // Keep spawns out of immediate center where players typically enter.
  const centerDx = x - W * 0.5;
  const centerDy = y - H * 0.5;
  if (centerDx * centerDx + centerDy * centerDy < clearRadius * clearRadius) return true;

  for (const o of obstacles) {
    if (x >= o.x - 18 && x <= o.x + o.w + 18 && y >= o.y - 18 && y <= o.y + o.h + 18) return true;
  }
  return false;
}

