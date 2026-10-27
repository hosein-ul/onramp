import { useId } from "react";
import { NETWORK, SITE } from "../config";
import { seeded } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps, type PreviewState } from "./shared";
import "./stamp.css";

/** A stamp whose ray pattern is derived from the hash it is given. */
function StampArt({ n, state, hash, slot }: { n: number; state: PreviewState; hash: Uint8Array | undefined; slot: string }) {
  const id = useId();
  const rand = seeded(hash ?? new Uint8Array(32).fill(n));
  const rays = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r1 = 38, r2 = 38 + 6 + rand() * 20;
    return <line key={i} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={100 + Math.sin(a) * r2} />;
  });
  return (
    <svg viewBox="0 0 200 200" className={`st-art ${state}`} role="img" aria-label={`Stamp ${n}: ${state}`}>
      <defs><path id={`${id}-p`} d="M100 100 m-82 0 a82 82 0 1 1 164 0 a82 82 0 1 1 -164 0" /></defs>
      <circle cx="100" cy="100" r="94" className="ring" fill="none" />
      <circle cx="100" cy="100" r="70" className="ring thin" fill="none" />
      {state === "verified" && <g className="rays">{rays}</g>}
      <text className="ringtext"><textPath href={`#${id}-p`} startOffset="0">{state === "verified" ? `VERIFIED ON-CHAIN · SLOT ${slot} · ` : state === "ready" ? "READY WHEN YOU ARE · READY WHEN YOU ARE · " : "LOCKED · LOCKED · LOCKED · LOCKED · LOCKED · "}</textPath></text>
      <text x="100" y="118" textAnchor="middle" className="digit">{n}</text>
    </svg>
  );
}

export function Stamp({ pulse, onStart }: DirectionProps) {
  const t = pulse.ticks;
  return (
    <div className="stp">
      <header className="stp-bar">
        <span className="stp-brand">WAYPOINT</span>
        <span className="stp-pill">{NETWORK.name} · {pulse.status === "live" ? "live" : pulse.status === "error" ? "offline" : "connecting"}</span>
      </header>
      <section className="stp-hero">
        <h1>Collect five<br /><span>on-chain stamps.</span></h1>
        <p>An unofficial guide to Thru. Do a thing on the real test network, and the chain itself stamps your passport. No sign-up, nothing stored on a server.</p>
        <button type="button" className="stp-btn" onClick={onStart}>Start the trail</button>
        <div className="stp-ticket" aria-label="Live network readout">
          <div><small>Slot right now</small><strong>{grouped(pulse.height)}</strong></div>
          <div><small>Block time</small><strong>{ms(pulse.slotTimeMs)}</strong></div>
          <div><small>RPC</small><strong>{ms(pulse.latencyMs)}</strong></div>
        </div>
        {pulse.status === "error" && <p className="stp-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
      </section>
      <section className="stp-book" aria-label="The trail">
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          const tk = t[Math.max(0, t.length - 1 - i * 9)];
          return (
            <button type="button" key={m.id} className={`stp-card ${st}`} onClick={onStart} style={{ "--tilt": `${[-1.2, 0.8, -0.6, 1, -0.9][i] ?? 0}deg` } as React.CSSProperties}>
              <StampArt n={i + 1} state={st} hash={tk?.hash} slot={tk ? tk.slot.toString() : "—"} />
              <strong>{m.title}</strong>
              <span>{m.goal}</span>
              <em>{st === "verified" ? "Verified" : st === "ready" ? "Your turn" : "Locked"}</em>
            </button>
          );
        })}
      </section>
      <footer className="stp-foot">{SITE.disclaimer}</footer>
    </div>
  );
}
