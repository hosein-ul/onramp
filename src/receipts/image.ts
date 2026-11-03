import { SITE } from "../config";
import { formatTime, grouped, short } from "../ui/format";
import type { Receipt } from "./receipt";

const W = 1200;
const H = 700;

/** Draws the receipt as a blueprint title block to a PNG in the browser. Nothing is uploaded. */
export async function renderReceiptPng(r: Receipt): Promise<Blob> {
  await Promise.all([document.fonts.load('700 80px "IBM Plex Sans Condensed"'), document.fonts.load('500 26px "IBM Plex Mono"')]).catch(() => undefined);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#0b2c66"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(214,232,255,.07)"; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(214,232,255,.2)";
  for (let x = 0; x <= W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = "#eaf3ff"; ctx.lineWidth = 3; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.lineWidth = 1; ctx.strokeRect(42, 42, W - 84, H - 84);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffd60a"; ctx.fillRect(72, 78, 18, 18);
  ctx.fillStyle = "#eaf3ff"; ctx.font = '600 30px "IBM Plex Sans Condensed", sans-serif'; ctx.fillText("Waypoint", 102, 96);
  ctx.textAlign = "right"; ctx.font = '500 20px "IBM Plex Mono", monospace'; ctx.fillStyle = "#86a5d6";
  ctx.fillText(`RECEIPT · ${r.network.toUpperCase()}`, W - 72, 94); ctx.textAlign = "left";

  ctx.fillStyle = "#eaf3ff"; ctx.font = '700 96px "IBM Plex Sans Condensed", sans-serif';
  ctx.fillText(r.title, 72, 230);

  ctx.fillStyle = "#7bf0c4"; ctx.fillRect(72, 262, 330, 36);
  ctx.fillStyle = "#03281a"; ctx.font = '600 20px "IBM Plex Mono", monospace'; ctx.fillText("■ VERIFIED ON-CHAIN", 86, 287);

  const cells: [string, string][] = [
    ["ADDRESS", short(r.address, 10, 8)],
    [r.signature ? "SIGNATURE" : "PROOF", r.signature ? short(r.signature, 12, 10) : "state read from the chain"],
    [r.signature ? "SLOT" : "READ AT SLOT", grouped(r.slot)],
    ["TIME", formatTime(r.timeMs)],
  ];
  const x0 = 72, y0 = 346, cw = (W - 144) / 2, ch = 92;
  ctx.strokeStyle = "rgba(214,232,255,.55)"; ctx.lineWidth = 1;
  cells.forEach(([k, v], i) => {
    const x = x0 + (i % 2) * cw, y = y0 + Math.floor(i / 2) * ch;
    ctx.strokeRect(x, y, cw, ch);
    ctx.fillStyle = "#86a5d6"; ctx.font = '500 16px "IBM Plex Mono", monospace'; ctx.fillText(k.split("").join(" "), x + 18, y + 32);
    ctx.fillStyle = "#eaf3ff"; ctx.font = '500 28px "IBM Plex Mono", monospace'; ctx.fillText(v, x + 18, y + 68);
  });
  ctx.fillStyle = "#7bf0c4"; ctx.font = '500 24px "IBM Plex Mono", monospace';
  ctx.fillText(r.summary.length > 78 ? `${r.summary.slice(0, 75)}…` : r.summary, 72, 598);
  ctx.fillStyle = "#86a5d6"; ctx.font = '400 16px "IBM Plex Mono", monospace'; ctx.textAlign = "right";
  ctx.fillText(SITE.disclaimer, W - 72, 630); ctx.textAlign = "left";

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
