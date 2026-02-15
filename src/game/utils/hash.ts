// Small deterministic hash utilities. These are pure functions and safe to test.
export function hash32(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit
  return h >>> 0;
}

export function mixSeed(...parts: Array<string | number>): number {
  const s = parts.map(p => String(p)).join("|");
  return hash32(s);
}
