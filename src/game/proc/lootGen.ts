import { Upgrades, upgradeWeight } from "../data/upgrades";
import { WeaponRarityWeight, Weapons, type WeaponDef } from "../data/weapons";
import { Tuning } from "../tuning";
import { RngStream } from "../utils/rng";
import type { RectLike, RoomEvent } from "./waveGen";

export type WeaponDropPlan = { id: string; x: number; y: number } | null;
export type AmmoDropPlan = { amount: number; x: number; y: number } | null;
export type HealthDropPlan = { amount: number; x: number; y: number } | null;
export type ShrinePlan = { x: number; y: number; upgradeId: string } | null;

export type LootPlan = {
  weaponDrop: WeaponDropPlan;
  ammoDrop: AmmoDropPlan;
  healthDrop: HealthDropPlan;
  shrine: ShrinePlan;
};

const W = Tuning.room.width;
const H = Tuning.room.height;

export function rollRoomLoot(
  rng: RngStream,
  depth: number,
  event: RoomEvent,
  obstacles: readonly RectLike[],
  ownedUpgrades: readonly string[]
): LootPlan {
  const weaponChance = clamp01(0.36 + depth * 0.011 + (event === "cache" ? 0.38 : 0));
  const ammoChance = clamp01(0.62 + (event === "swarm" ? 0.2 : 0));
  const healthChance = clamp01(0.26 + depth * 0.006 + (event === "gauntlet" ? 0.1 : 0));
  const shrineChance = clamp01(0.14 + (event === "shrine" ? 0.75 : 0));

  const weaponDrop = rng.chance(weaponChance)
    ? { id: rollWeaponId(rng, depth), ...randomFreePoint(rng, obstacles) }
    : null;

  const ammoDrop = rng.chance(ammoChance)
    ? { amount: rng.int(20, 54) + Math.floor(depth * 1.2), ...randomFreePoint(rng, obstacles) }
    : null;

  const healthDrop = rng.chance(healthChance)
    ? { amount: rng.int(1, 2), ...randomFreePoint(rng, obstacles) }
    : null;

  const shrine = rng.chance(shrineChance)
    ? {
      upgradeId: rollUpgradeId(rng, ownedUpgrades),
      ...randomFreePoint(rng, obstacles)
    }
    : null;

  return {
    weaponDrop,
    ammoDrop,
    healthDrop,
    shrine
  };
}

export function rollWeaponId(rng: RngStream, depth: number): string {
  const candidates = Weapons.map(weapon => {
    let weight = rarityWeightByDepth(weapon, depth);
    if (depth < 3 && weapon.rarity === "epic") weight *= 0.2;
    if (depth < 6 && weapon.rarity === "legendary") weight *= 0.05;
    return { weapon, weight };
  }).filter(c => c.weight > 0);

  return weightedPick(rng, candidates).id;
}

export function rollUpgradeId(rng: RngStream, ownedUpgrades: readonly string[]): string {
  const available = Upgrades.filter(upgrade => !ownedUpgrades.includes(upgrade.id));
  const pool = available.length > 0 ? available : Upgrades;
  const candidates = pool.map(upgrade => ({ weapon: upgrade, weight: upgradeWeight(upgrade) }));
  return weightedPick(rng, candidates).id;
}

function rarityWeightByDepth(weapon: WeaponDef, depth: number): number {
  const base = WeaponRarityWeight[weapon.rarity];
  if (weapon.rarity === "common") return Math.max(8, base - depth * 2.2);
  if (weapon.rarity === "uncommon") return base + depth * 1.3;
  if (weapon.rarity === "rare") return base + Math.max(0, depth - 2) * 1.4;
  if (weapon.rarity === "epic") return base + Math.max(0, depth - 5) * 1.8;
  return base + Math.max(0, depth - 9) * 2.1;
}

function weightedPick<T extends { weight: number; weapon: { id: string } }>(
  rng: RngStream,
  candidates: readonly T[]
): T["weapon"] {
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return candidates[0].weapon;

  let r = rng.float(0, total);
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c.weapon;
  }
  return candidates[candidates.length - 1].weapon;
}

function randomFreePoint(rng: RngStream, obstacles: readonly RectLike[]): { x: number; y: number } {
  for (let i = 0; i < 36; i++) {
    const x = rng.int(110, W - 110);
    const y = rng.int(96, H - 96);
    let blocked = false;
    for (const o of obstacles) {
      if (x >= o.x - 14 && x <= o.x + o.w + 14 && y >= o.y - 14 && y <= o.y + o.h + 14) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return { x, y };
  }
  return { x: W * 0.5, y: H * 0.5 };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

