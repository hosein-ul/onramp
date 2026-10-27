import { useMemo } from "react";
import { NETWORK, SITE } from "../config";
import { seeded, shorten, toHex } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps, type PreviewState } from "./shared";
import "./monument.css";

const S = 32; // pixels per unit
const C30 = Math.cos(Math.PI / 6);
const OX = 300;
const OY = 590;

/** Isometric projection. x runs down-right, y runs down-left, z is up. */
const P = (x: number, y: number, z: number): [number, number] => [OX + (x - y) * C30 * S, OY + (x + y) * 0.5 * S - z * S];
const pts = (arr: [number, number][]) => arr.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

interface Floor { x: number; y: number; w: number; d: number; z: number; h: number }

function Cuboid({ f, state, label }: { f: Floor; state: PreviewState; label: string }) {
  const { x, y, w, d, z, h } = f;
  const top = pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]);
  const left = pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]);
  const right = pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]);
  const wins: JSX.Element[] = [];
  if (state === "verified") {
    const nL = Math.max(2, Math.floor(w * 1.1));
    for (let i = 0; i < nL; i++) {
      const a = x + 0.35 + (i * (w - 0.7)) / nL, b = a + (w - 0.7) / nL - 0.28;
      wins.push(<polygon key={`l${i}`} className="win" points={pts([P(a, y + d, z + 0.3), P(b, y + d, z + 0.3), P(b, y + d, z + h - 0.3), P(a, y + d, z + h - 0.3)])} />);
    }
    const nR = Math.max(2, Math.floor(d * 1.1));
    for (let i = 0; i < nR; i++) {
      const a = y + 0.35 + (i * (d - 0.7)) / nR, b = a + (d - 0.7) / nR - 0.28;
      wins.push(<polygon key={`r${i}`} className="win dim" points={pts([P(x + w, a, z + 0.3), P(x + w, b, z + 0.3), P(x + w, b, z + h - 0.3), P(x + w, a, z + h - 0.3)])} />);
    }
  }
  return (
    <g className={`mo-floor ${state}`} aria-label={label}>
      <polygon className="f-left" points={left} />
      <polygon className="f-right" points={right} />
      <polygon className="f-top" points={top} />
      {wins}
    </g>
  );
}

export function Monument({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const floors = useMemo<Floor[]>(() => {
    let z = 0;
    return stops.map((m, i) => {
      const seedTick = pulse.ticks[Math.max(0, pulse.ticks.length - 1 - i * 9)];
      const rand = seeded(seedTick?.hash ?? new Uint8Array(32).fill(i + 1));
      const w = 4.2 + rand() * 2.4, d = 4.2 + rand() * 2.4;
      const f = { x: -w / 2 + (rand() - 0.5) * 1.2, y: -d / 2 + (rand() - 0.5) * 1.2, w, d, z, h: 2.2 };
      z += f.h + 0.08;
      void m;
      return f;
    });
  }, [pulse.ticks]);

  // Ring of recent blocks around the base.
  const ring = pulse.ticks.slice(-24);
  const R = 7.4;

  return (
    <div className="mo">
      <header className="mo-bar">
        <span className="mo-brand">WAYPOINT</span>
        <span className="mo-net"><i className={pulse.status} />{NETWORK.name} · slot {grouped(pulse.height)}</span>
      </header>
      <section className="mo-hero">
        <div className="mo-copy">
          <p className="mo-eyebrow">An unofficial guide to Thru</p>
          <h1>Build your<br />monument.</h1>
          <p className="mo-lede">Each mission you finish adds a floor to a tower that is yours alone. Its shape comes from the transaction hashes the chain recorded for you, and every lit window is a fact on the network.</p>
          <button type="button" className="mo-btn" onClick={onStart}>Start building</button>
          <dl className="mo-stats">
            <div><dt>Block time</dt><dd>{ms(pulse.slotTimeMs)}</dd></div>
            <div><dt>RPC</dt><dd>{ms(pulse.latencyMs)}</dd></div>
            <div><dt>Latest block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd></div>
          </dl>
          {pulse.status === "error" && <p className="mo-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        </div>

        <svg className="mo-scene" viewBox="0 0 820 760" role="img" aria-label="An isometric tower with five floors, one per mission">
          <defs>
            <radialGradient id="mo-glow" cx="50%" cy="62%" r="55%"><stop offset="0" stopColor="#1d2a44" /><stop offset="1" stopColor="#0b0f18" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="820" height="760" fill="url(#mo-glow)" />
          {/* ground grid */}
          <g className="mo-grid">
            {Array.from({ length: 17 }, (_, i) => {
              const k = -8 + i;
              return <g key={i}><polyline points={pts([P(k, -8, 0), P(k, 8, 0)])} /><polyline points={pts([P(-8, k, 0), P(8, k, 0)])} /></g>;
            })}
          </g>
          {/* recent blocks as a ring of small cubes */}
          {ring.map((t, i) => {
            const a = (i / Math.max(ring.length, 1)) * Math.PI * 2;
            const h = 0.4 + ((t.hash[0] ?? 0) / 255) * 1.6;
            const cx = Math.cos(a) * R, cy = Math.sin(a) * R;
            const isNew = i === ring.length - 1;
            return <Cuboid key={t.slot.toString()} f={{ x: cx - 0.3, y: cy - 0.3, w: 0.6, d: 0.6, z: 0, h }} state={isNew ? "ready" : "locked"} label={`block ${t.slot.toString()}`} />;
          })}
          {/* tower floors, bottom first so higher floors overlap correctly */}
          {floors.map((f, i) => <Cuboid key={i} f={f} state={PREVIEW_STATES[i] ?? "locked"} label={`Floor ${i + 1}: ${stops[i]?.title ?? ""}`} />)}
          {/* leader lines and labels */}
          {floors.map((f, i) => {
            const [px, py] = P(f.x + f.w, f.y + f.d / 2, f.z + f.h / 2);
            const ly = 130 + (4 - i) * 112;
            const st = PREVIEW_STATES[i] ?? "locked";
            return (
              <g key={`l${i}`} className={`mo-lab ${st}`}>
                <polyline points={`${px.toFixed(1)},${py.toFixed(1)} ${(px + 24).toFixed(1)},${ly} 600,${ly}`} fill="none" />
                <circle cx={px} cy={py} r="3" />
                <text x="608" y={ly - 6} className="n">{String(i + 1).padStart(2, "0")} · {st === "verified" ? "VERIFIED" : st === "ready" ? "READY" : "LOCKED"}</text>
                <text x="608" y={ly + 14} className="t">{stops[i]?.title}</text>
              </g>
            );
          })}
        </svg>
        <ol className="mo-list" aria-label="Floors">
          {stops.map((s, i) => {
            const st = PREVIEW_STATES[i] ?? "locked";
            return <li key={s.id} className={st}><span>{String(i + 1).padStart(2, "0")} · {st === "verified" ? "VERIFIED" : st === "ready" ? "READY" : "LOCKED"}</span><strong>{s.title}</strong></li>;
          })}
        </ol>
      </section>
      <footer className="mo-foot"><span>{SITE.disclaimer}</span><button type="button" className="mo-link" onClick={onStart}>Open the trail →</button></footer>
    </div>
  );
}
