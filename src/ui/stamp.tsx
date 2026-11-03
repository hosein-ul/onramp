import { useId } from "react";

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const C = 24;
const CELL = 4;
const PAD = 14;
const SIZE = C * CELL + PAD * 2;

function rng(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

/** A symmetric, dithered picture computed from a seed. The same seed always gives the same stamp. */
export function stampCells(seed: string): boolean[][] {
  const r = rng(seed);
  const half = C / 2;
  const field: number[][] = [];
  for (let y = 0; y < C; y++) {
    field[y] = [];
    for (let x = 0; x < half; x++) {
      const dx = (x - half + 0.5) / half, dy = (y - C / 2 + 0.5) / (C / 2);
      field[y]![x] = Math.max(0, 1 - Math.hypot(dx * 0.9, dy)) * 0.9 + r() * 0.55 - 0.1;
    }
  }
  const out: boolean[][] = [];
  for (let y = 0; y < C; y++) {
    out[y] = [];
    for (let x = 0; x < C; x++) {
      const xx = x < half ? x : C - 1 - x;
      out[y]![x] = field[y]![xx]! > BAYER[y % 4]![x % 4]! / 16 + 0.08;
    }
  }
  return out;
}

export const STAMP_ASPECT = (SIZE + 18) / SIZE;

/** Draws a stamp onto a canvas context. Shared with the downloadable receipt image. */
export function drawStamp(ctx: CanvasRenderingContext2D, seed: string, label: string, x: number, y: number, width: number): void {
  const s = width / SIZE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#fafafa"; ctx.fillRect(0, 0, SIZE, SIZE + 18);
  ctx.strokeStyle = "#0a0a0b"; ctx.lineWidth = 1; ctx.strokeRect(6, 6, SIZE - 12, SIZE + 6);
  const cells = stampCells(seed);
  ctx.fillStyle = "#0a0a0b";
  cells.forEach((row, cy) => row.forEach((on, cx) => { if (on) ctx.fillRect(PAD + cx * CELL, PAD + cy * CELL, CELL, CELL); }));
  ctx.font = '500 11px "Geist Mono", monospace'; ctx.textAlign = "center"; ctx.fillText(label, SIZE / 2, SIZE + 6);
  ctx.fillStyle = "#eeeff0";
  for (let i = 0; i <= SIZE; i += 8) { ctx.beginPath(); ctx.arc(i, 0, 3, 0, 7); ctx.arc(i, SIZE + 18, 3, 0, 7); ctx.fill(); }
  for (let i = 0; i <= SIZE + 18; i += 8) { ctx.beginPath(); ctx.arc(0, i, 3, 0, 7); ctx.arc(SIZE, i, 3, 0, 7); ctx.fill(); }
  ctx.restore();
}

/** A perforated, postage-style stamp whose picture is computed from a seed (a transaction signature or an address). */
export function Stamp({ seed, label, width = 112, press = true }: { seed: string; label: string; width?: number; press?: boolean }) {
  const id = useId().replace(/:/g, "");
  const cells = stampCells(seed);
  const holes: [number, number][] = [];
  for (let i = 0; i <= SIZE; i += 8) { holes.push([i, 0], [i, SIZE + 18]); }
  for (let i = 0; i <= SIZE + 18; i += 8) { holes.push([0, i], [SIZE, i]); }
  return (
    <svg className={`stamp${press ? " press" : ""}`} viewBox={`0 0 ${SIZE} ${SIZE + 18}`} width={width} role="img" aria-label={`Stamp ${label}, drawn from ${seed.slice(0, 12)}`}>
      <defs><mask id={`m${id}`}><rect width={SIZE} height={SIZE + 18} fill="#fff" />{holes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#000" />)}</mask></defs>
      <g mask={`url(#m${id})`}>
        <rect width={SIZE} height={SIZE + 18} fill="#fafafa" />
        <rect x="6" y="6" width={SIZE - 12} height={SIZE + 6} fill="none" stroke="#0a0a0b" strokeWidth="1" />
        {cells.map((row, y) => row.map((on, x) => on ? <rect key={`${x}-${y}`} x={PAD + x * CELL} y={PAD + y * CELL} width={CELL} height={CELL} fill="#0a0a0b" /> : null))}
        <text x={SIZE / 2} y={SIZE + 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="11" fontWeight="500" fill="#0a0a0b">{label}</text>
      </g>
    </svg>
  );
}
