import type { RunModifiers } from "../types";

export type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic";
  // Apply permanent stat modifier changes for this run.
  apply(mods: RunModifiers): RunModifiers;
  // Optional one-time heal or max health bonus.
  bonusMaxHealth?: number;
  bonusHeal?: number;
};

export const Upgrades: readonly UpgradeDef[] = [
  {
    id: "overclock",
    name: "Overclock Coils",
    description: "20% faster fire rate",
    rarity: "common",
    apply: mods => ({ ...mods, fireRateMult: mods.fireRateMult * 0.8 })
  },
  {
    id: "hollowpoint",
    name: "Hollowpoint Lattice",
    description: "20% more bullet damage",
    rarity: "common",
    apply: mods => ({ ...mods, damageMult: mods.damageMult * 1.2 })
  },
  {
    id: "hypercoil",
    name: "Hypercoil Capacitor",
    description: "35% faster projectiles",
    rarity: "common",
    apply: mods => ({ ...mods, projectileSpeedMult: mods.projectileSpeedMult * 1.35 })
  },
  {
    id: "stabilizer",
    name: "Gyro Stabilizer",
    description: "35% tighter spread",
    rarity: "common",
    apply: mods => ({ ...mods, spreadMult: mods.spreadMult * 0.65 })
  },
  {
    id: "scavenger",
    name: "Scavenger Lenses",
    description: "50% more ammo from pickups",
    rarity: "common",
    apply: mods => ({ ...mods, ammoPickupMult: mods.ammoPickupMult * 1.5 })
  },
  {
    id: "piercer",
    name: "Piercer Matrix",
    description: "Bullets pierce +1 target",
    rarity: "rare",
    apply: mods => ({ ...mods, pierceBonus: mods.pierceBonus + 1 })
  },
  {
    id: "bloodlink",
    name: "Bloodlink Nanites",
    description: "Heal on kill",
    rarity: "rare",
    apply: mods => ({ ...mods, lifeOnKill: mods.lifeOnKill + 0.14 })
  },
  {
    id: "criticality",
    name: "Criticality Prism",
    description: "12% crit chance",
    rarity: "rare",
    apply: mods => ({ ...mods, critChance: mods.critChance + 0.12 })
  },
  {
    id: "ward",
    name: "Resonant Ward",
    description: "+1 max health and heal 1",
    rarity: "epic",
    bonusMaxHealth: 1,
    bonusHeal: 1,
    apply: mods => ({ ...mods })
  }
] as const;

export const UpgradeById: Record<string, UpgradeDef> = Object.fromEntries(
  Upgrades.map(upgrade => [upgrade.id, upgrade])
);

const rarityWeight: Record<UpgradeDef["rarity"], number> = {
  common: 64,
  rare: 28,
  epic: 8
};

export function upgradeWeight(upgrade: UpgradeDef): number {
  return rarityWeight[upgrade.rarity];
}

