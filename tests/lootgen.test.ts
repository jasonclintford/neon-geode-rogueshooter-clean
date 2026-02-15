import { describe, expect, it } from "vitest";
import { rollRoomLoot } from "../src/game/proc/lootGen";
import { RngStream } from "../src/game/utils/rng";

describe("Loot generation determinism", () => {
  it("room loot rolls are stable for same seed and inputs", () => {
    const a = rollRoomLoot(
      new RngStream(1234),
      8,
      "cache",
      [{ x: 200, y: 200, w: 80, h: 40 }],
      ["overclock"]
    );
    const b = rollRoomLoot(
      new RngStream(1234),
      8,
      "cache",
      [{ x: 200, y: 200, w: 80, h: 40 }],
      ["overclock"]
    );

    expect(a).toEqual(b);
  });

  it("different seed produces different loot frequently", () => {
    const a = rollRoomLoot(new RngStream(222), 6, "skirmish", [], []);
    const b = rollRoomLoot(new RngStream(333), 6, "skirmish", [], []);
    expect(a).not.toEqual(b);
  });
});

