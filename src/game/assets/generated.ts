import Phaser from "phaser";

export function ensureGeneratedTextures(scene: Phaser.Scene): void {
  const tx = scene.textures;

  if (!tx.exists("player")) {
    const g = scene.add.graphics();
    // Neon geode pilot ship, pointed right.
    g.fillStyle(0x0a1134, 1);
    g.fillTriangle(37, 13, 9, 1, 9, 25);

    g.fillStyle(0xf8fdff, 0.98);
    g.fillTriangle(34, 13, 12, 4, 12, 22);

    g.fillStyle(0x2aecff, 0.95);
    g.fillTriangle(30, 13, 15, 8, 15, 18);

    g.fillStyle(0xa4ffff, 0.96);
    g.fillRoundedRect(18, 9, 8, 8, 2);

    g.fillStyle(0xff78bd, 0.92);
    g.fillRect(23, 15, 4, 3);
    g.fillRect(20, 6, 3, 2);

    g.fillStyle(0x39eeff, 1);
    g.fillRect(31, 11, 7, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(36, 12, 3, 2);

    g.fillStyle(0xffbe68, 0.95);
    g.fillTriangle(2, 13, 10, 18, 10, 8);
    g.fillStyle(0xff7f43, 0.95);
    g.fillTriangle(3, 13, 8, 16, 8, 10);

    g.lineStyle(2, 0x58f2ff, 0.88);
    g.beginPath();
    g.moveTo(35, 13);
    g.lineTo(11, 22);
    g.lineTo(11, 4);
    g.closePath();
    g.strokePath();

    g.generateTexture("player", 40, 26);
    g.destroy();
  }

  ensureEnemyTexture(scene, "enemy_mite", 14, 14, 0xff8e37, 0x25e6ff, "square");
  ensureEnemyTexture(scene, "enemy_wisp", 16, 16, 0xff5df0, 0x27f0ff, "circle");
  ensureEnemyTexture(scene, "enemy_brute", 22, 20, 0xff6939, 0x8450ff, "square");
  ensureEnemyTexture(scene, "enemy_lancer", 18, 18, 0xffbc4e, 0x39efff, "diamond");
  ensureEnemyTexture(scene, "enemy_sentry", 20, 20, 0x8a8dff, 0x30f8ff, "turret");
  ensureEnemyTexture(scene, "enemy_charger", 22, 16, 0xff6e87, 0x47e8ff, "diamond");
  ensureEnemyTexture(scene, "enemy_bomber", 20, 20, 0xff8e29, 0xff4fd8, "circle");
  ensureEnemyTexture(scene, "enemy_oracle", 24, 24, 0xe6e2ff, 0x7f5cff, "oracle");
  ensureEnemyTexture(scene, "enemy_shardling", 16, 14, 0xffb65c, 0x29f0ff, "diamond");
  ensureEnemyTexture(scene, "enemy_sentinel", 22, 22, 0x9ad0ff, 0xff84d4, "turret");

  if (!tx.exists("bullet")) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 3);
    g.generateTexture("bullet", 12, 3);
    g.destroy();
  }
  if (!tx.exists("enemy_bullet")) {
    const g = scene.add.graphics();
    g.fillStyle(0xff8e4d, 1);
    g.fillCircle(4, 4, 4);
    g.lineStyle(1, 0xffffff, 0.7);
    g.strokeCircle(4, 4, 3);
    g.generateTexture("enemy_bullet", 8, 8);
    g.destroy();
  }
  if (!tx.exists("spark")) {
    const g = scene.add.graphics();
    g.fillStyle(0x34f7ff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("spark", 3, 3);
    g.destroy();
  }
  if (!tx.exists("ember")) {
    const g = scene.add.graphics();
    g.fillStyle(0xff9b3d, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture("ember", 6, 6);
    g.destroy();
  }
  if (!tx.exists("glow")) {
    const g = scene.add.graphics();
    g.fillStyle(0x3feeff, 0.45);
    g.fillCircle(12, 12, 12);
    g.generateTexture("glow", 24, 24);
    g.destroy();
  }
  if (!tx.exists("glow_orange")) {
    const g = scene.add.graphics();
    g.fillStyle(0xff8e33, 0.4);
    g.fillCircle(12, 12, 12);
    g.generateTexture("glow_orange", 24, 24);
    g.destroy();
  }
  if (!tx.exists("pickup_weapon")) {
    const g = scene.add.graphics();
    g.fillStyle(0x744cff, 0.95);
    g.fillRoundedRect(0, 0, 20, 20, 4);
    g.lineStyle(2, 0x39e9ff, 1);
    g.strokeRoundedRect(1, 1, 18, 18, 4);
    g.generateTexture("pickup_weapon", 20, 20);
    g.destroy();
  }
  if (!tx.exists("pickup_ammo")) {
    const g = scene.add.graphics();
    g.fillStyle(0xffb04a, 1);
    g.fillRect(0, 0, 14, 20);
    g.fillStyle(0x1f1638, 1);
    g.fillRect(3, 3, 8, 10);
    g.generateTexture("pickup_ammo", 14, 20);
    g.destroy();
  }
  if (!tx.exists("pickup_health")) {
    const g = scene.add.graphics();
    g.fillStyle(0x37ffa9, 0.95);
    g.fillRect(6, 0, 6, 18);
    g.fillRect(0, 6, 18, 6);
    g.lineStyle(2, 0x25e7ff, 0.95);
    g.strokeRect(0, 6, 18, 6);
    g.strokeRect(6, 0, 6, 18);
    g.generateTexture("pickup_health", 18, 18);
    g.destroy();
  }
  if (!tx.exists("pickup_shrine")) {
    const g = scene.add.graphics();
    g.fillStyle(0x24164b, 1);
    g.fillCircle(12, 12, 11);
    g.lineStyle(2, 0xff9f3a, 1);
    g.strokeCircle(12, 12, 10);
    g.lineStyle(2, 0x39e9ff, 0.9);
    g.strokeCircle(12, 12, 6);
    g.generateTexture("pickup_shrine", 24, 24);
    g.destroy();
  }
  if (!tx.exists("hazard_pulse")) {
    const g = scene.add.graphics();
    g.fillStyle(0x2c1550, 0.85);
    g.fillCircle(20, 20, 18);
    g.lineStyle(3, 0x38e8ff, 0.9);
    g.strokeCircle(20, 20, 15);
    g.generateTexture("hazard_pulse", 40, 40);
    g.destroy();
  }
  if (!tx.exists("hazard_ember")) {
    const g = scene.add.graphics();
    g.fillStyle(0x5b1620, 0.9);
    g.fillCircle(16, 16, 14);
    g.lineStyle(3, 0xff8f2c, 1);
    g.strokeCircle(16, 16, 12);
    g.generateTexture("hazard_ember", 32, 32);
    g.destroy();
  }
  if (!tx.exists("door_lock")) {
    const g = scene.add.graphics();
    g.fillStyle(0x312350, 0.85);
    g.fillRect(0, 0, 48, 18);
    g.lineStyle(2, 0x25ebff, 0.9);
    g.strokeRect(1, 1, 46, 16);
    g.generateTexture("door_lock", 48, 18);
    g.destroy();
  }

  if (!tx.exists("portal_gate")) {
    const g = scene.add.graphics();
    g.fillStyle(0x1b1047, 0.92);
    g.fillCircle(24, 24, 20);
    g.lineStyle(4, 0x2ceeff, 1);
    g.strokeCircle(24, 24, 18);
    g.lineStyle(2, 0xffa85a, 0.9);
    g.strokeCircle(24, 24, 10);
    g.generateTexture("portal_gate", 48, 48);
    g.destroy();
  }

  if (!tx.exists("obstacle_orb")) {
    const g = scene.add.graphics();
    g.fillStyle(0x152a48, 0.95);
    g.fillCircle(32, 32, 30);
    g.lineStyle(3, 0x39eeff, 0.7);
    g.strokeCircle(32, 32, 28);
    g.generateTexture("obstacle_orb", 64, 64);
    g.destroy();
  }

  if (!tx.exists("obstacle_diamond")) {
    const g = scene.add.graphics();
    g.fillStyle(0x1b2148, 0.95);
    g.beginPath();
    g.moveTo(32, 0);
    g.lineTo(64, 32);
    g.lineTo(32, 64);
    g.lineTo(0, 32);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0x8d6cff, 0.8);
    g.strokePath();
    g.generateTexture("obstacle_diamond", 64, 64);
    g.destroy();
  }

  if (!tx.exists("obstacle_hex")) {
    const g = scene.add.graphics();
    g.fillStyle(0x13244a, 0.95);
    g.beginPath();
    g.moveTo(16, 0);
    g.lineTo(48, 0);
    g.lineTo(64, 32);
    g.lineTo(48, 64);
    g.lineTo(16, 64);
    g.lineTo(0, 32);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0x2ceeff, 0.72);
    g.strokePath();
    g.generateTexture("obstacle_hex", 64, 64);
    g.destroy();
  }

  if (!tx.exists("decor_crystal_small")) {
    const g = scene.add.graphics();
    g.fillStyle(0x2ce9ff, 0.9);
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(20, 12);
    g.lineTo(10, 24);
    g.lineTo(0, 12);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xc6ffff, 0.75);
    g.strokePath();
    g.generateTexture("decor_crystal_small", 20, 24);
    g.destroy();
  }

  if (!tx.exists("decor_crystal_tall")) {
    const g = scene.add.graphics();
    g.fillStyle(0x7b64ff, 0.9);
    g.beginPath();
    g.moveTo(10, 0);
    g.lineTo(24, 20);
    g.lineTo(12, 42);
    g.lineTo(0, 20);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x38ecff, 0.72);
    g.strokePath();
    g.generateTexture("decor_crystal_tall", 24, 42);
    g.destroy();
  }

  if (!tx.exists("decor_pillar")) {
    const g = scene.add.graphics();
    g.fillStyle(0x1a274e, 0.95);
    g.fillRoundedRect(0, 0, 16, 46, 4);
    g.fillStyle(0x2ce9ff, 0.55);
    g.fillRect(6, 4, 4, 38);
    g.lineStyle(2, 0x8d6cff, 0.76);
    g.strokeRoundedRect(1, 1, 14, 44, 4);
    g.generateTexture("decor_pillar", 16, 46);
    g.destroy();
  }

  if (!tx.exists("decor_rune")) {
    const g = scene.add.graphics();
    g.fillStyle(0x1b1142, 0.72);
    g.fillCircle(18, 18, 16);
    g.lineStyle(2, 0x39eeff, 0.86);
    g.strokeCircle(18, 18, 15);
    g.lineStyle(2, 0xff9f4f, 0.75);
    g.strokeCircle(18, 18, 8);
    g.generateTexture("decor_rune", 36, 36);
    g.destroy();
  }

  if (!tx.exists("decor_spike")) {
    const g = scene.add.graphics();
    g.fillStyle(0xff893e, 0.9);
    g.fillTriangle(0, 30, 10, 0, 20, 30);
    g.fillStyle(0x39ebff, 0.6);
    g.fillTriangle(6, 24, 10, 8, 14, 24);
    g.generateTexture("decor_spike", 20, 30);
    g.destroy();
  }
}

function ensureEnemyTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  fill: number,
  stroke: number,
  shape: "square" | "circle" | "diamond" | "turret" | "oracle"
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();

  if (shape === "square") {
    g.fillStyle(fill, 1);
    g.fillRoundedRect(0, 0, width, height, 3);
    g.lineStyle(2, stroke, 1);
    g.strokeRoundedRect(1, 1, width - 2, height - 2, 3);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(3, 3, width - 6, Math.max(2, Math.floor(height * 0.2)));
  } else if (shape === "circle") {
    const r = Math.floor(Math.min(width, height) * 0.45);
    g.fillStyle(fill, 0.95);
    g.fillCircle(width * 0.5, height * 0.5, r);
    g.lineStyle(2, stroke, 0.95);
    g.strokeCircle(width * 0.5, height * 0.5, r);
    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(width * 0.38, height * 0.35, Math.max(2, Math.floor(r * 0.35)));
  } else if (shape === "diamond") {
    g.fillStyle(fill, 0.95);
    g.beginPath();
    g.moveTo(width * 0.5, 0);
    g.lineTo(width, height * 0.5);
    g.lineTo(width * 0.5, height);
    g.lineTo(0, height * 0.5);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, stroke, 0.9);
    g.strokePath();
    g.lineStyle(2, 0xffffff, 0.42);
    g.beginPath();
    g.moveTo(width * 0.5, 4);
    g.lineTo(width * 0.5, height - 4);
    g.strokePath();
  } else if (shape === "turret") {
    g.fillStyle(fill, 0.95);
    g.fillRoundedRect(1, 1, width - 2, height - 2, 4);
    g.fillStyle(stroke, 0.9);
    g.fillRect(width * 0.35, -1, width * 0.3, 8);
    g.lineStyle(2, 0xffffff, 0.65);
    g.strokeRoundedRect(1, 1, width - 2, height - 2, 4);
    g.fillStyle(0xffffff, 0.36);
    g.fillCircle(width * 0.5, height * 0.55, Math.max(2, Math.floor(width * 0.14)));
  } else {
    g.fillStyle(fill, 0.94);
    g.fillCircle(width * 0.5, height * 0.5, width * 0.44);
    g.lineStyle(2, stroke, 1);
    g.strokeCircle(width * 0.5, height * 0.5, width * 0.4);
    g.fillStyle(stroke, 0.9);
    g.fillCircle(width * 0.5, height * 0.5, width * 0.17);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(width * 0.5, height * 0.5, width * 0.27);
  }

  g.generateTexture(key, width, height);
  g.destroy();
}


