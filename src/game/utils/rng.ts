export type RngNext = () => number;

// mulberry32: small, fast, decent quality for gameplay RNG.
export function mulberry32(seed: number): RngNext {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RngStream {
  private nextFn: RngNext;
  constructor(seed: number) {
    this.nextFn = mulberry32(seed);
  }

  next(): number { return this.nextFn(); }

  int(minIncl: number, maxIncl: number): number {
    const r = this.next();
    const n = Math.floor(r * (maxIncl - minIncl + 1)) + minIncl;
    return Math.min(maxIncl, Math.max(minIncl, n));
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
