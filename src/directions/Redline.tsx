import { NETWORK, SITE } from "../config";
import { shorten, toHex } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stateLabel, stops, type DirectionProps } from "./shared";
import "./redline.css";

const C = 200;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (deg: number, r: number): [number, number] => [C + Math.cos(rad(deg)) * r, C + Math.sin(rad(deg)) * r];
const ang = (v: number, max: number) => 135 + 270 * Math.min(Math.max(v / max, 0), 1.04);
function arc(a0: number, a1: number, r: number): string {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** A round gauge with a spring-loaded needle and a red zone. Every reading is a real measurement. */
function Gauge({ value, max, redFrom, label, unit, step, minor }: { value: number | undefined; max: number; redFrom: number; label: string; unit: string; step: number; minor: number }) {
  const majors: number[] = [];
  for (let v = 0; v <= max; v += step) majors.push(v);
  const minors: number[] = [];
  for (let v = 0; v <= max; v += minor) minors.push(v);
  const a = ang(value ?? 0, max);
  const inRed = value !== undefined && value >= redFrom;
  return (
    <figure className={`rl-gauge${inRed ? " hot" : ""}`}>
      <svg viewBox="0 0 400 400" role="img" aria-label={`${label}: ${value === undefined ? "no reading" : `${Math.round(value)} ${unit}`}`}>
        <defs>
          <radialGradient id="rl-bez" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#4a4a52" /><stop offset=".6" stopColor="#1c1c20" /><stop offset="1" stopColor="#0b0b0d" /></radialGradient>
          <radialGradient id="rl-face" cx="50%" cy="40%" r="65%"><stop offset="0" stopColor="#1b1b1f" /><stop offset="1" stopColor="#0a0a0c" /></radialGradient>
          <filter id="rl-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx={C} cy={C} r="196" fill="url(#rl-bez)" />
        <circle cx={C} cy={C} r="178" fill="url(#rl-face)" stroke="#000" strokeWidth="2" />
        <path d={arc(ang(redFrom, max), ang(max, max), 160)} className="redzone" fill="none" />
        {minors.map((v) => { const [x0, y0] = pt(ang(v, max), 150), [x1, y1] = pt(ang(v, max), 158); return <line key={`m${v}`} x1={x0} y1={y0} x2={x1} y2={y1} className={`tk minor${v >= redFrom ? " r" : ""}`} />; })}
        {majors.map((v) => { const [x0, y0] = pt(ang(v, max), 138), [x1, y1] = pt(ang(v, max), 158), [tx, ty] = pt(ang(v, max), 116); return (
          <g key={`M${v}`}><line x1={x0} y1={y0} x2={x1} y2={y1} className={`tk major${v >= redFrom ? " r" : ""}`} /><text x={tx} y={ty + 6} textAnchor="middle" className="num">{v}</text></g>
        ); })}
        <text x={C} y={C + 62} textAnchor="middle" className="g-label">{label}</text>
        <text x={C} y={C + 118} textAnchor="middle" className="g-read">{value === undefined ? "—" : Math.round(value)}<tspan className="g-unit"> {unit}</tspan></text>
        <g className="needle" style={{ transform: `rotate(${a}deg)`, transformOrigin: `${C}px ${C}px` }}>
          <polygon points={`${C - 22},${C - 3} ${C + 150},${C - 1} ${C + 150},${C + 1} ${C - 22},${C + 3}`} filter="url(#rl-glow)" />
        </g>
        <circle cx={C} cy={C} r="14" className="cap" /><circle cx={C} cy={C} r="5" fill="#0b0b0d" />
      </svg>
    </figure>
  );
}

/** The centre cluster: recent blocks as a lit bar-graph arc, the slot as a large readout. */
function Slot({ ticks, height }: { ticks: { slot: bigint; hash: Uint8Array }[]; height: bigint | undefined }) {
  const N = 56;
  return (
    <figure className="rl-slot">
      <svg viewBox="0 0 560 480" role="img" aria-label={`Finalized slot ${height?.toString() ?? "loading"}`}>
        <defs><filter id="rl-glow2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {Array.from({ length: N }, (_, i) => {
          const t = ticks[ticks.length - N + i];
          const a = 150 + (240 * i) / (N - 1);
          const len = 14 + (t ? ((t.hash[0] ?? 0) / 255) * 30 : 0);
          const x0 = 280 + Math.cos(rad(a)) * 224, y0 = 270 + Math.sin(rad(a)) * 224;
          const x1 = 280 + Math.cos(rad(a)) * (224 + len), y1 = 270 + Math.sin(rad(a)) * (224 + len);
          const now = i === N - 1 && !!t;
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className={now ? "bt now" : t ? "bt" : "bt off"} filter={now ? "url(#rl-glow2)" : undefined} />;
        })}
        <text x="280" y="228" textAnchor="middle" className="s-k">FINALIZED SLOT · {NETWORK.name.toUpperCase()}</text>
        <text x="280" y="320" textAnchor="middle" className="s-v">{grouped(height)}</text>
        <text x="280" y="360" textAnchor="middle" className="s-k dim">LAST {ticks.length} BLOCKS · LENGTH = FIRST BYTE OF HASH</text>
      </svg>
    </figure>
  );
}

const SW = [
  { n: "Redline", v: "#FF2B2B", c: "#FF2B2B", ink: "#fff", u: "Attention and the danger zone." },
  { n: "Tarmac", v: "#09090B", c: "#09090B", ink: "#fff", u: "The ground." },
  { n: "Dash", v: "#16161A", c: "#16161A", ink: "#fff", u: "Panels." },
  { n: "Chrome", v: "#8A8A94", c: "#8A8A94", ink: "#09090B", u: "Secondary text and bezels." },
  { n: "Verified", v: "#34D17E", c: "#34D17E", ink: "#09090B", u: "A fact the chain confirmed." },
];

export function Redline({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const verified = PREVIEW_STATES.filter((s) => s === "verified").length;
  return (
    <div className="rl">
      <header className="rl-nav">
        <span className="rl-logo">WAYPOINT</span>
        <span className="rl-chip"><i className={pulse.status} />{NETWORK.name} · {pulse.status === "live" ? "live" : pulse.status === "error" ? "no signal" : "connecting"}</span>
        <button type="button" className="rl-btn small" onClick={onStart}>Start the trail</button>
      </header>

      <section className="rl-hero">
        <div className="rl-copy">
          <p className="rl-eyebrow">An unofficial guide to Thru</p>
          <h1>Learn Thru<br />by using it.</h1>
          <p className="rl-lede">Five missions on a live network. Watch the instruments move, do the thing, and the chain itself confirms it.</p>
          <button type="button" className="rl-btn" onClick={onStart}>Start the trail</button>
        </div>
        <div className="rl-cluster">
          <Gauge value={pulse.latencyMs} max={500} redFrom={300} label="RPC" unit="ms" step={100} minor={20} />
          <Slot ticks={pulse.ticks} height={pulse.height} />
          <Gauge value={pulse.slotTimeMs} max={2000} redFrom={1500} label="BLOCK TIME" unit="ms" step={500} minor={100} />
        </div>
        {pulse.status === "error" && <p className="rl-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
      </section>

      <section className="rl-panel" aria-label="The trail">
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          return (
            <button key={m.id} type="button" className={`rl-key ${st}`} onClick={onStart} disabled={st === "locked"}>
              <i className="rl-lamp" aria-hidden="true" />
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <strong>{m.title}</strong>
              <span className="g">{m.goal}</span>
              <code>{m.reads}</code>
              <em>{stateLabel[st]}</em>
            </button>
          );
        })}
      </section>

      <section className="rl-sys" aria-label="Design system preview">
        <div className="rl-sys-head"><span>Design system · v0.1</span><span>Redline</span></div>
        <div className="rl-row"><h2>Colour</h2><div className="rl-sw">{SW.map((s) => <div key={s.n} style={{ background: s.c, color: s.ink }} className={s.n === "Tarmac" ? "edge" : ""}><strong>{s.n}</strong><code>{s.v}</code><small>{s.u}</small></div>)}</div></div>
        <div className="rl-row"><h2>Type</h2>
          <div className="rl-ty">
            <div><span className="a">0 1 2 3</span><p>Barlow Condensed 600<br />Numbers and instrument labels. Uppercase, tracked out.</p></div>
            <div><span className="b">Learn Thru</span><p>Barlow Condensed 700<br />Headlines. Narrow, so a line carries weight.</p></div>
            <div><span className="c">GetAccount</span><p>JetBrains Mono 500<br />Chain terms and signatures.</p></div>
          </div>
        </div>
        <div className="rl-row"><h2>Parts</h2>
          <div className="rl-pt">
            <div><p className="rl-k">Lamps</p><div className="rl-lamps"><span><i className="rl-lamp rl-l-ok" />Verified</span><span><i className="rl-lamp rl-l-red" />Your turn</span><span><i className="rl-lamp" />Locked</span></div></div>
            <div><p className="rl-k">Progress</p><div className="rl-led" role="img" aria-label={`${verified} of 5 verified`}>{PREVIEW_STATES.map((s, i) => <i key={i} className={s} />)}</div></div>
            <div><p className="rl-k">Button</p><button className="rl-btn" type="button">Verify</button></div>
            <div><p className="rl-k">Receipt</p><div className="rl-slip"><strong>VERIFIED ON-CHAIN</strong><dl><dt>Slot</dt><dd>{grouped(pulse.height)}</dd><dt>Block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd></dl></div></div>
          </div>
        </div>
        <div className="rl-row rl-rules"><h2>Rules</h2>
          <ol>
            <li>Red means attention. It is lit only where the user must look or act.</li>
            <li>Every number is a measurement with a unit and a scale. No bare decimals.</li>
            <li>Needles move with spring. Everything else is still.</li>
            <li>Green appears only next to a fact the chain confirmed.</li>
          </ol>
        </div>
      </section>
      <footer className="rl-foot">{SITE.disclaimer} · {ms(pulse.slotTimeMs)} block time</footer>
    </div>
  );
}
