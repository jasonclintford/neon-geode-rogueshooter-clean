export const Tuning = {
  player: {
    speed: 300,
    accel: 2400,
    drag: 1700,
    maxHealth: 5,
    iFramesMs: 650,
    dash: {
      speed: 860,
      durationMs: 120,
      cooldownMs: 850
    }
  },
  bullets: {
    ttlMs: 920,
    hitShake: 0.004
  },
  room: {
    width: 2200,
    height: 1320,
    wallThickness: 28,
    obstacleCountMin: 14,
    obstacleCountMax: 30,
    obstaclePadding: 90
  },
  spawn: {
    baseEnemies: 8,
    perDepth: 1,
    maxEnemies: 34
  },
  loot: {
    weaponDropChance: 0.52,
    ammoDropChance: 0.72
  }
} as const;
