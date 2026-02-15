export type RoomCoord = { x: number; y: number };

export type RunModifiers = {
  fireRateMult: number;
  damageMult: number;
  projectileSpeedMult: number;
  spreadMult: number;
  ammoPickupMult: number;
  pierceBonus: number;
  critChance: number;
  critDamageMult: number;
  lifeOnKill: number;
};

export const DefaultRunModifiers: RunModifiers = {
  fireRateMult: 1,
  damageMult: 1,
  projectileSpeedMult: 1,
  spreadMult: 1,
  ammoPickupMult: 1,
  pierceBonus: 0,
  critChance: 0,
  critDamageMult: 1.75,
  lifeOnKill: 0
};

export type RunState = {
  runSeed: number;
  depth: number;
  score: number;
  bestScore: number;
  bestDepth: number;
  room: RoomCoord;
  visited: Set<string>;
  weaponId: string;
  ammo: number;
  health: number;
  maxHealth: number;
  enemyRemaining: number;
  streak: number;
  multiplier: number;
  kills: number;
  roomsCleared: number;
  upgrades: string[];
  modifiers: RunModifiers;
  roomTheme: string;
  portalRooms: Map<string, { x: number; y: number; active: boolean }>;
  paused: boolean;
  gameOver: boolean;
};

export function roomKey(rc: RoomCoord): string {
  return `${rc.x},${rc.y}`;
}
