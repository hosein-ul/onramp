import { useEffect, useRef } from "react";
import { NETWORK, SITE } from "../config";
import { shorten, toHex } from "../lib/bytes";
import { drawPlate, PALETTE } from "./plate";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps, type PreviewState } from "./shared";
import "./print.css";

function Plate({ seed, state, w, h, label }: { seed: Uint8Array; state: PreviewState; w: number; h: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlate(ctx, w, h, seed, { amount: state === "verified" ? 1 : state === "ready" ? 0.35 : 0, outline: state === "ready" });
  }, [seed, state, w, h]);
  return <canvas ref={ref} className={`pr-canvas ${state}`} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label={label} />;
}

export function Print({ pulse, onStart }: DirectionProps) {
  const ticks = pulse.ticks;
  const hero = ticks.find((t) => t.slot % 64n === 0n) ?? ticks[ticks.length - 1];
  const seed = hero?.hash ?? new Uint8Array(32).fill(5);
  return (
    <div className="pr">
      <header className="pr-bar">
        <span className="pr-brand">Waypoint</span>
        <span className="pr-net">{NETWORK.name} · slot {grouped(pulse.height)} · block time {ms(pulse.slotTimeMs)}</span>
      </header>

      <section className="pr-hero">
        <div className="pr-copy">
          <p className="pr-eyebrow">An unofficial guide to Thru</p>
          <h1>Every block<br />is a <em>painting.</em></h1>
          <p className="pr-lede">Finish five short missions on the live network and collect five plates. Each one is generated from a real block hash, so no two are alike and none can be faked.</p>
          <div className="pr-cta">
            <button type="button" className="pr-btn" onClick={onStart}>Start the trail</button>
            <span className="pr-swatches" aria-hidden="true">{PALETTE.slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>
          </div>
          {pulse.status === "error" && <p className="pr-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        </div>
        <figure className="pr-frame">
          <Plate seed={seed} state="verified" w={720} h={860} label="Generative plate drawn from the latest checkpoint block hash" />
          <figcaption>
            <span>Plate 00 · From block {hero ? hero.slot.toString() : "—"}</span>
            <span>{hero ? shorten(toHex(hero.hash), 8, 6) : "waiting for the chain"}</span>
          </figcaption>
        </figure>
      </section>

      <section className="pr-plates" aria-label="The trail">
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          const tk = ticks[Math.max(0, ticks.length - 1 - i * 9)];
          return (
            <button key={m.id} type="button" className={`pr-card ${st}`} onClick={onStart}>
              <Plate seed={tk?.hash ?? new Uint8Array(32).fill(i + 1)} state={st} w={300} h={380} label={`Plate ${i + 1}, ${st}`} />
              <span className="pr-no">Plate {String(i + 1).padStart(2, "0")}</span>
              <strong>{m.title}</strong>
              <span className="pr-goal">{m.goal}</span>
              <span className="pr-state">{st === "verified" ? "Collected" : st === "ready" ? "Draft · your turn" : "Not yet drawn"}</span>
            </button>
          );
        })}
      </section>
      <footer className="pr-foot">{SITE.disclaimer}</footer>
    </div>
  );
}
