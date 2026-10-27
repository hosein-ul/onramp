import { SITE } from "../config";
import { formatTime, grouped, short } from "../ui/format";
import type { Receipt } from "./receipt";

const W = 1200;
const H = 700;

function barcode(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number): void {
  let seed = 0;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  let cx = x;
  ctx.fillStyle = "#f1f1f3";
  while (cx < x + w) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const bar = 2 + (seed % 4);
    if ((seed >>> 8) % 2 === 0) ctx.fillRect(cx, y, bar, h);
    cx += bar + 2;
  }
}

/** Draws the receipt to a PNG in the browser. Nothing is uploaded. */
export async function renderReceiptPng(r: Receipt): Promise<Blob> {
  await Promise.all([document.fonts.load('600 64px "Barlow Condensed"'), document.fonts.load('500 26px "JetBrains Mono"')]).catch(() => undefined);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = "#09090b"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H + 80, 20, W / 2, H + 80, 700);
  glow.addColorStop(0, "rgba(255,43,43,.35)"); glow.addColorStop(1, "rgba(255,43,43,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ff2b2b"; ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  ctx.font = '700 44px "Barlow Condensed", sans-serif';
  ctx.fillText("WAYPOINT  ·  VERIFIED ON-CHAIN", 56, 63);
  ctx.font = '500 22px "JetBrains Mono", monospace'; ctx.textAlign = "right";
  ctx.fillText(r.network.toUpperCase(), W - 56, 62); ctx.textAlign = "left";

  ctx.fillStyle = "#f1f1f3"; ctx.font = '700 92px "Barlow Condensed", sans-serif';
  ctx.fillText(r.title.toUpperCase(), 56, 220);

  const rows: [string, string][] = [
    ["ADDRESS", short(r.address, 10, 8)],
    ["SIGNATURE", r.signature ? short(r.signature, 12, 10) : "state read, no single transaction"],
    [r.signature ? "SLOT" : "READ AT SLOT", grouped(r.slot)],
    ["TIME", formatTime(r.timeMs)],
  ];
  let y = 300;
  for (const [k, v] of rows) {
    ctx.fillStyle = "#8a8a94"; ctx.font = '600 22px "Barlow Condensed", sans-serif'; ctx.fillText(k.split("").join(" "), 56, y);
    ctx.fillStyle = "#f1f1f3"; ctx.font = '500 30px "JetBrains Mono", monospace'; ctx.fillText(v, 330, y);
    y += 62;
  }
  ctx.fillStyle = "#34d17e"; ctx.font = '500 26px "JetBrains Mono", monospace';
  ctx.fillText(r.summary.length > 70 ? `${r.summary.slice(0, 67)}…` : r.summary, 56, 570);
  barcode(ctx, r.signature ?? r.address, 56, 596, 520, 52);
  ctx.fillStyle = "#6a6a74"; ctx.font = '500 18px "JetBrains Mono", monospace'; ctx.textAlign = "right";
  ctx.fillText(SITE.disclaimer, W - 56, 640); ctx.textAlign = "left";

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/png"));
}

export async function downloadReceiptPng(r: Receipt): Promise<void> {
  const blob = await renderReceiptPng(r);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `waypoint-${r.missionId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
