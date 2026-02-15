export type EnemyAi =
  | "chaser"
  | "strafer"
  | "sniper"
  | "turret"
  | "charger"
  | "bomber";

export type EnemyDef = {
  id: string;
  name: string;
  maxHp: number;
  speed: number;
  contactDamage: number;
  scoreValue: number;
  ai: EnemyAi;
  threat: number;
  minDepth: number;
  textureKey: string;
  projectileDamage?: number;
  projectileSpeed?: number;
  fireRateMs?: number;
  projectileSpreadDeg?: number;
  burst?: number;
};

export const Enemies: readonly EnemyDef[] = [
  {
    id: "mite",
    name: "Geode Mite",
    maxHp: 24,
    speed: 146,
    contactDamage: 1,
    scoreValue: 28,
    ai: "chaser",
    threat: 1,
    minDepth: 0,
    textureKey: "enemy_mite"
  },
  {
    id: "wisp",
    name: "Neon Wisp",
    maxHp: 18,
    speed: 172,
    contactDamage: 1,
    scoreValue: 34,
    ai: "strafer",
    threat: 1.2,
    minDepth: 0,
    textureKey: "enemy_wisp",
    projectileDamage: 1,
    projectileSpeed: 420,
    fireRateMs: 1700,
    projectileSpreadDeg: 10
  },
  {
    id: "shardling",
    name: "Shardling",
    maxHp: 14,
    speed: 210,
    contactDamage: 1,
    scoreValue: 32,
    ai: "chaser",
    threat: 1.05,
    minDepth: 1,
    textureKey: "enemy_shardling"
  },
  {
    id: "brute",
    name: "Basalt Brute",
    maxHp: 74,
    speed: 94,
    contactDamage: 2,
    scoreValue: 92,
    ai: "chaser",
    threat: 2.8,
    minDepth: 2,
    textureKey: "enemy_brute"
  },
  {
    id: "lancer",
    name: "Prism Lancer",
    maxHp: 30,
    speed: 126,
    contactDamage: 1,
    scoreValue: 72,
    ai: "sniper",
    threat: 2.2,
    minDepth: 3,
    textureKey: "enemy_lancer",
    projectileDamage: 2,
    projectileSpeed: 620,
    fireRateMs: 1500,
    burst: 1
  },
  {
    id: "sentry",
    name: "Aegis Sentry",
    maxHp: 45,
    speed: 16,
    contactDamage: 1,
    scoreValue: 88,
    ai: "turret",
    threat: 2.4,
    minDepth: 4,
    textureKey: "enemy_sentry",
    projectileDamage: 2,
    projectileSpeed: 510,
    fireRateMs: 950,
    burst: 2,
    projectileSpreadDeg: 8
  },
  {
    id: "charger",
    name: "Shard Charger",
    maxHp: 42,
    speed: 108,
    contactDamage: 2,
    scoreValue: 102,
    ai: "charger",
    threat: 2.6,
    minDepth: 5,
    textureKey: "enemy_charger"
  },
  {
    id: "bomber",
    name: "Ignis Bomber",
    maxHp: 36,
    speed: 104,
    contactDamage: 1,
    scoreValue: 110,
    ai: "bomber",
    threat: 2.9,
    minDepth: 6,
    textureKey: "enemy_bomber",
    projectileDamage: 2,
    projectileSpeed: 440,
    fireRateMs: 1450,
    burst: 3,
    projectileSpreadDeg: 22
  },
  {
    id: "sentinel",
    name: "Hex Sentinel",
    maxHp: 52,
    speed: 72,
    contactDamage: 2,
    scoreValue: 136,
    ai: "sniper",
    threat: 3.2,
    minDepth: 7,
    textureKey: "enemy_sentinel",
    projectileDamage: 2,
    projectileSpeed: 680,
    fireRateMs: 1120,
    burst: 2,
    projectileSpreadDeg: 7
  },
  {
    id: "oracle",
    name: "Void Oracle",
    maxHp: 58,
    speed: 148,
    contactDamage: 2,
    scoreValue: 172,
    ai: "sniper",
    threat: 4.5,
    minDepth: 9,
    textureKey: "enemy_oracle",
    projectileDamage: 3,
    projectileSpeed: 700,
    fireRateMs: 1050,
    burst: 3,
    projectileSpreadDeg: 16
  }
] as const;

export const EnemyById: Record<string, EnemyDef> = Object.fromEntries(
  Enemies.map(e => [e.id, e])
);
