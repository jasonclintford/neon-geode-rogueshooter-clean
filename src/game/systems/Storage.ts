const SCORE_KEY = "neon_geode_best_score_v2";
const DEPTH_KEY = "neon_geode_best_depth_v1";

export function loadBestScore(): number {
  const raw = localStorage.getItem(SCORE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveBestScore(score: number): void {
  localStorage.setItem(SCORE_KEY, String(score));
}

export function loadBestDepth(): number {
  const raw = localStorage.getItem(DEPTH_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveBestDepth(depth: number): void {
  localStorage.setItem(DEPTH_KEY, String(depth));
}
