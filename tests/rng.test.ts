import { describe, expect, it } from "vitest";
import { mulberry32, RngStream } from "../src/game/utils/rng";
import { mixSeed } from "../src/game/utils/hash";

describe("RNG determinism", () => {
  it("mulberry32 is deterministic for same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBeCloseTo(b(), 12);
    }
  });

  it("mixSeed is stable", () => {
    expect(mixSeed(1, 2, 3)).toBe(mixSeed(1, 2, 3));
    expect(mixSeed("a", "b")).toBe(mixSeed("a", "b"));
  });

  it("RngStream int bounds are inclusive", () => {
    const rng = new RngStream(999);
    for (let i = 0; i < 100; i++) {
      const n = rng.int(4, 6);
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
});
