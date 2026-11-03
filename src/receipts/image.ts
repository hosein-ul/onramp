import { MISSIONS_V1 } from "../../missions/v1";
import { SITE } from "../config";
import { drawStamp } from "../ui/stamp";
import { formatTime, grouped, short } from "../ui/format";
import { stampSeed, type Receipt } from "./receipt";

const W = 1200;
const H = 700;

/** Draws the receipt, with its stamp, to a PNG in the browser. Nothing is uploaded. */
export async function renderReceiptPng(r: Receipt): Promise<Blob> {
  await Promise.all([document.fonts.load('500 72px "Geist"'), document.fonts.load('500 26px "Geist Mono"')]).catch(() => undefined);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#eeeff0"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#0a0a0b"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(56, 92); ctx.lineTo(W - 56, 92); ctx.stroke();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0a0a0b"; ctx.font = '600 28px "Geist", sans-serif'; ctx.fillText("Waypoint", 56, 66);
  ctx.textAlign = "right"; ctx.font = '500 20px "Geist Mono", monospace'; ctx.fillStyle = "#7c7e84";
  ctx.fillText(`RECEIPT · ${r.network.toUpperCase()}`, W - 56, 64); ctx.textAlign = "left";

  const n = MISSIONS_V1.missions.findIndex((m) => m.id === r.missionId) + 1;
  drawStamp(ctx, stampSeed(r), `${String(n).padStart(2, "0")} · VERIFIED`, 56, 140, 330);

  const x = 450;
  ctx.fillStyle = "#00985f"; ctx.fillRect(x, 150, 14, 14);
  ctx.font = '500 22px "Geist Mono", monospace'; ctx.fillText("Verified on chain", x + 28, 164);
  ctx.fillStyle = "#0a0a0b"; ctx.font = '500 68px "Geist", sans-serif';
  ctx.fillText(r.title.length > 24 ? `${r.title.slice(0, 23)}…` : r.title, x, 250);
  const rows: [string, string][] = [
    ["Address", short(r.address, 10, 8)],
    [r.signature ? "Signature" : "Proof", r.signature ? short(r.signature, 12, 10) : "state read from the chain"],
    [r.signature ? "Slot" : "Read at slot", grouped(r.slot)],
    ["Time", formatTime(r.timeMs)],
  ];
  let y = 316;
  for (const [k, v] of rows) {
    ctx.strokeStyle = "rgba(10,10,11,.18)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(W - 56, y - 30); ctx.stroke();
    ctx.fillStyle = "#7c7e84"; ctx.font = '400 22px "Geist", sans-serif'; ctx.fillText(k, x, y);
    ctx.fillStyle = "#0a0a0b"; ctx.font = '500 24px "Geist Mono", monospace'; ctx.textAlign = "right"; ctx.fillText(v, W - 56, y); ctx.textAlign = "left";
    y += 58;
  }
  ctx.fillStyle = "#4a4c51"; ctx.font = '400 24px "Geist", sans-serif';
  ctx.fillText(r.summary.length > 74 ? `${r.summary.slice(0, 71)}…` : r.summary, 56, 586);
  ctx.fillStyle = "#7c7e84"; ctx.font = '400 16px "Geist Mono", monospace';
  ctx.fillText("The stamp is drawn from the signature. The proof is the chain.", 56, 640);
  ctx.textAlign = "right"; ctx.fillText(SITE.disclaimer, W - 56, 640); ctx.textAlign = "left";

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
