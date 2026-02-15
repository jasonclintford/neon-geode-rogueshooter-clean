export type WeaponFxProfile =
  | "pistol"
  | "shotgun"
  | "rifle"
  | "laser"
  | "rocket"
  | "rail"
  | "plasma"
  | "smg";

export type WeaponDef = {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  fireRateMs: number;
  pellets: number;
  spreadDeg: number;
  projectileSpeed: number;
  damage: number;
  knockback: number;
  ammoMax: number;
  reloadMs: number;
  shotKick: number;
  fxProfile: WeaponFxProfile;
  pierce: number;
  ttlMs?: number;
  explosionRadius?: number;
  ammoPerShot?: number;
};

export const Weapons: readonly WeaponDef[] = [
  {
    id: "pistol",
    name: "Ion Pistol",
    rarity: "common",
    fireRateMs: 170,
    pellets: 1,
    spreadDeg: 2,
    projectileSpeed: 930,
    damage: 12,
    knockback: 130,
    ammoMax: 140,
    reloadMs: 950,
    shotKick: 0.006,
    fxProfile: "pistol",
    pierce: 0
  },
  {
    id: "shardsmg",
    name: "Shard SMG",
    rarity: "common",
    fireRateMs: 65,
    pellets: 1,
    spreadDeg: 8,
    projectileSpeed: 1020,
    damage: 7,
    knockback: 90,
    ammoMax: 260,
    reloadMs: 1250,
    shotKick: 0.005,
    fxProfile: "smg",
    pierce: 0
  },
  {
    id: "burstRifle",
    name: "Prism Burst Rifle",
    rarity: "uncommon",
    fireRateMs: 230,
    pellets: 3,
    spreadDeg: 5,
    projectileSpeed: 1030,
    damage: 9,
    knockback: 105,
    ammoMax: 210,
    reloadMs: 1180,
    shotKick: 0.008,
    fxProfile: "rifle",
    pierce: 0
  },
  {
    id: "shotgun",
    name: "Shard Shotgun",
    rarity: "uncommon",
    fireRateMs: 500,
    pellets: 8,
    spreadDeg: 24,
    projectileSpeed: 740,
    damage: 8,
    knockback: 210,
    ammoMax: 52,
    reloadMs: 1180,
    shotKick: 0.011,
    fxProfile: "shotgun",
    pierce: 0
  },
  {
    id: "plasmafan",
    name: "Plasma Fan",
    rarity: "rare",
    fireRateMs: 320,
    pellets: 5,
    spreadDeg: 34,
    projectileSpeed: 860,
    damage: 11,
    knockback: 150,
    ammoMax: 90,
    reloadMs: 1020,
    shotKick: 0.009,
    fxProfile: "plasma",
    pierce: 1,
    ttlMs: 730
  },
  {
    id: "laser",
    name: "Violet Laser Lance",
    rarity: "rare",
    fireRateMs: 45,
    pellets: 1,
    spreadDeg: 0.8,
    projectileSpeed: 1500,
    damage: 7,
    knockback: 56,
    ammoMax: 310,
    reloadMs: 950,
    shotKick: 0.004,
    fxProfile: "laser",
    pierce: 1,
    ttlMs: 650
  },
  {
    id: "railgun",
    name: "Geode Railgun",
    rarity: "epic",
    fireRateMs: 620,
    pellets: 1,
    spreadDeg: 0.3,
    projectileSpeed: 1700,
    damage: 62,
    knockback: 280,
    ammoMax: 38,
    reloadMs: 1400,
    shotKick: 0.014,
    fxProfile: "rail",
    pierce: 3,
    ttlMs: 880
  },
  {
    id: "rocket",
    name: "Nova Rocket Tube",
    rarity: "epic",
    fireRateMs: 700,
    pellets: 1,
    spreadDeg: 3,
    projectileSpeed: 540,
    damage: 38,
    knockback: 420,
    ammoMax: 26,
    reloadMs: 1520,
    shotKick: 0.014,
    fxProfile: "rocket",
    pierce: 0,
    explosionRadius: 74
  },
  {
    id: "cataclysm",
    name: "Cataclysm Arc",
    rarity: "legendary",
    fireRateMs: 380,
    pellets: 6,
    spreadDeg: 44,
    projectileSpeed: 1200,
    damage: 20,
    knockback: 260,
    ammoMax: 80,
    reloadMs: 1360,
    shotKick: 0.015,
    fxProfile: "plasma",
    pierce: 2,
    ttlMs: 780,
    ammoPerShot: 2
  }
] as const;

export const WeaponById: Record<string, WeaponDef> = Object.fromEntries(
  Weapons.map(w => [w.id, w])
);

export const WeaponRarityWeight: Record<WeaponDef["rarity"], number> = {
  common: 55,
  uncommon: 27,
  rare: 12,
  epic: 5,
  legendary: 1
};

