import { describe, expect, it } from "vitest";
import { generateRoomLayout } from "../src/game/proc/roomGen";

describe("Room generation determinism", () => {
  it("same seed and coord produce identical layout", () => {
    const a = generateRoomLayout(12345, { x: 2, y: -1 }, 4, ["overclock"]);
    const b = generateRoomLayout(12345, { x: 2, y: -1 }, 4, ["overclock"]);

    expect(a.seed).toBe(b.seed);
    expect(a.theme).toEqual(b.theme);
    expect(a.event).toEqual(b.event);
    expect(a.obstacles).toEqual(b.obstacles);
    expect(a.hazards).toEqual(b.hazards);
    expect(a.decorations).toEqual(b.decorations);
    expect(a.enemyPlan).toEqual(b.enemyPlan);
    expect(a.weaponDrop).toEqual(b.weaponDrop);
    expect(a.ammoDrop).toEqual(b.ammoDrop);
    expect(a.healthDrop).toEqual(b.healthDrop);
    expect(a.shrine).toEqual(b.shrine);
    expect(a.portal).toEqual(b.portal);
  });

  it("different coord changes layout", () => {
    const a = generateRoomLayout(12345, { x: 2, y: -1 }, 4);
    const b = generateRoomLayout(12345, { x: 3, y: -1 }, 4);
    expect(a.seed).not.toBe(b.seed);
  });
});
