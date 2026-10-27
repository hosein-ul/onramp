import { useMemo } from "react";
import { NETWORK, SITE } from "../config";
import { seeded, shorten, toHex } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps } from "./shared";
import "./chart.css";

const WP: [number, number][] = [[120, 560], [250, 430], [420, 470], [560, 300], [700, 170]];

function Map({ seed }: { seed: Uint8Array | undefined }) {
  const rings = useMemo(() => {
    const rand = seeded(seed ?? new Uint8Array(32).fill(3));
    const harm = [0, 1, 2].map(() => ({ f: 2 + Math.floor(rand() * 3), p: rand() * 6.283, a: 0.05 + rand() * 0.08 }));
    const cx = 470 + (rand() - 0.5) * 60, cy = 330 + (rand() - 0.5) * 40;
    const out: { d: string; major: boolean }[] = [];
    for (let k = 1; k <= 14; k++) {
      const base = 22 + k * 24;
      const pts: string[] = [];
      for (let i = 0; i <= 110; i++) {
        const a = (i / 110) * 6.283;
        let r = base;
        for (const h of harm) r += base * h.a * (0.6 + k / 14) * Math.sin(h.f * a + h.p + k * 0.12);
        pts.push(`${(cx + Math.cos(a) * r * 1.25).toFixed(1)},${(cy + Math.sin(a) * r * 0.9).toFixed(1)}`);
      }
      out.push({ d: `M${pts.join("L")}Z`, major: k % 4 === 0 });
    }
    return out;
  }, [seed]);
  const route = WP.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <svg className="ch-map" viewBox="0 0 800 680" role="img" aria-label="Chart of the five stops on the trail">
      <defs><clipPath id="ch-clip"><rect x="40" y="40" width="720" height="600" /></clipPath></defs>
      <g className="grat">
        {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={40 + i * 90} x2={40 + i * 90} y1="40" y2="640" />)}
        {Array.from({ length: 8 }, (_, i) => <line key={`h${i}`} x1="40" x2="760" y1={40 + i * 85.7} y2={40 + i * 85.7} />)}
      </g>
      <g clipPath="url(#ch-clip)" className="rings">{rings.map((r, i) => <path key={i} d={r.d} className={r.major ? "major" : undefined} fill="none" />)}</g>
      <rect x="40" y="40" width="720" height="600" className="frame" fill="none" />
      <path d={route} className="route" fill="none" />
      {WP.map(([x, y], i) => {
        const st = PREVIEW_STATES[i] ?? "locked";
        return (
          <g key={i} transform={`translate(${x} ${y})`} className={`wp ${st}`}>
            <circle r="9" /><circle r="3" className="core" />
            <text x="-16" y="-12" textAnchor="end">WP{i + 1}</text>
            <text x="-16" y="4" textAnchor="end" className="sub">{stops[i]?.title}</text>
          </g>
        );
      })}
      <g transform="translate(690 560)" className="compass">
        <circle r="34" fill="none" /><path d="M0 -44 L7 0 L0 44 L-7 0Z" /><path d="M-44 0 L0 -7 L44 0 L0 7Z" className="e" /><text y="-52" textAnchor="middle">N</text>
      </g>
      <g transform="translate(60 618)" className="scale"><line x2="120" /><line y1="-5" y2="5" /><line x1="120" x2="120" y1="-5" y2="5" /><text x="130" y="4">1 division ≈ 1 block</text></g>
    </svg>
  );
}

export function Chart({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const seed = (pulse.ticks.find((t) => t.slot % 64n === 0n) ?? pulse.ticks[0])?.hash;
  return (
    <div className="ch">
      <header className="ch-bar"><span className="ch-brand">WAYPOINT</span><span>Survey chart · {NETWORK.name} · {pulse.status === "live" ? "position fixed" : pulse.status === "error" ? "no fix" : "acquiring"}</span></header>
      <section className="ch-hero">
        <div className="ch-copy">
          <p className="ch-eyebrow">An unofficial guide to Thru</p>
          <h1>Five waypoints.<br />One live network.</h1>
          <p className="ch-lede">Walk the route from an empty wallet to your first token transfer. At every waypoint the chain itself confirms you were there.</p>
          <button type="button" className="ch-btn" onClick={onStart}>Begin the route</button>
          <dl className="ch-fix">
            <div><dt>Slot</dt><dd>{grouped(pulse.height)}</dd></div>
            <div><dt>Block time</dt><dd>{ms(pulse.slotTimeMs)}</dd></div>
            <div><dt>Block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd></div>
          </dl>
          {pulse.status === "error" && <p className="ch-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        </div>
        <Map seed={seed} />
      </section>
      <section className="ch-log" aria-label="Route log">
        <h2>Route log</h2>
        <ol>
          {stops.map((m, i) => {
            const st = PREVIEW_STATES[i] ?? "locked";
            return (
              <li key={m.id} className={st}>
                <span className="n">WP{i + 1}</span>
                <span className="t"><strong>{m.title}</strong><em>{m.goal}</em></span>
                <span className="r">{m.reads}</span>
                <span className="s">{st === "verified" ? "Verified" : st === "ready" ? "Next" : "Ahead"}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <footer className="ch-foot">{SITE.disclaimer}</footer>
    </div>
  );
}
