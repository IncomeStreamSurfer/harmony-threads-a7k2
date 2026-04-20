const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 5;

export function hitOrReject(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  return { ok: true, retryAfterSec: 0 };
}
