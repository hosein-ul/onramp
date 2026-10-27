import { seeded } from "../lib/bytes";

export const PALETTE = ["#111111", "#e8352b", "#2447f5", "#ffcf33", "#ff9fc0", "#f4f1ec"] as const;

/** Smooth 2D value noise from a seeded generator. */
function makeNoise(rand: () => number, size = 9) {
  const g = Array.from({ length: size * size }, () => rand());
  const at = (x: number, y: number) => g[(((y % size) + size) % size) * size + (((x % size) + size) % size)] ?? 0;
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export interface PlateOptions {
  /** 0..1: how much of the composition to draw. Locked plates draw nothing. */
  amount: number;
  /** Draw only outlines (used for the plate that is ready). */
  outline?: boolean;
}

/** A flow-field composition derived entirely from the seed bytes (a block hash). */
export function drawPlate(ctx: CanvasRenderingContext2D, w: number, h: number, seed: Uint8Array, opt: PlateOptions): void {
  const rand = seeded(seed);
  const noise = makeNoise(rand);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (opt.amount <= 0) { ctx.restore(); return; }

  const palette = [PALETTE[1], PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[0]];
  const scale = 1.2 + rand() * 1.4;
  const count = Math.round(70 * opt.amount + 6);
  const margin = Math.min(w, h) * 0.06;

  // A few large flat circles give each plate a focal mass.
  for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
    const r = Math.min(w, h) * (0.12 + rand() * 0.2);
    ctx.fillStyle = palette[Math.floor(rand() * 4)] ?? "#111";
    ctx.beginPath();
    ctx.arc(margin + rand() * (w - 2 * margin), margin + rand() * (h - 2 * margin), r, 0, Math.PI * 2);
    if (opt.outline) { ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.stroke(); } else ctx.fill();
  }

  for (let i = 0; i < count; i++) {
    let x = margin + rand() * (w - 2 * margin);
    let y = margin + rand() * (h - 2 * margin);
    const color = palette[Math.floor(rand() * palette.length)] ?? "#111";
    const width = 2 + rand() * rand() * Math.min(w, h) * 0.045;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = opt.outline ? "#111" : color;
    ctx.lineWidth = opt.outline ? 1.2 : width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 30 + Math.floor(rand() * 70);
    for (let s = 0; s < steps; s++) {
      const a = noise((x / w) * scale * 6, (y / h) * scale * 6) * Math.PI * 4;
      x += Math.cos(a) * 5;
      y += Math.sin(a) * 5;
      if (x < margin || x > w - margin || y < margin || y > h - margin) break;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
