import { describe, expect, it } from "vitest";
import { generateEnemyWave, rollRoomEvent } from "../src/game/proc/waveGen";
import { RngStream } from "../src/game/utils/rng";

describe("Enemy wave generation determinism", () => {
  it("same seed/depth/event produces identical wave", () => {
    const obstacles = [
      { x: 100, y: 100, w: 80, h: 80 },
      { x: 420, y: 220, w: 120, h: 40 }
    ];
    const a = generateEnemyWave(new RngStream(987654), 9, obstacles, "gauntlet");
    const b = generateEnemyWave(new RngStream(987654), 9, obstacles, "gauntlet");
    expect(a).toEqual(b);
  });

  it("room event roll is stable", () => {
    const a = rollRoomEvent(new RngStream(777), 12);
    const b = rollRoomEvent(new RngStream(777), 12);
    expect(a).toBe(b);
  });
});

