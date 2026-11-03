import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { grouped } from "./format";

const C = 200;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (deg: number, r: number): [number, number] => [C + Math.cos(rad(deg)) * r, C + Math.sin(rad(deg)) * r];
const ang = (v: number, max: number) => 135 + 270 * Math.min(Math.max(v / max, 0), 1.04);

function arc(a0: number, a1: number, r: number): string {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

interface GaugeProps { value: number | undefined; max: number; redFrom: number; label: string; unit: string; step: number; minor: number }

/** A round gauge with a spring-loaded needle and a red zone. Every reading is a real measurement. */
export function Gauge({ value, max, redFrom, label, unit, step, minor }: GaugeProps) {
  const majors: number[] = [];
  for (let v = 0; v <= max; v += step) majors.push(v);
  const minors: number[] = [];
  for (let v = 0; v <= max; v += minor) minors.push(v);
  const inRed = value !== undefined && value >= redFrom;
  const id = `g-${label.replace(/\W/g, "")}`;
  return (
    <figure className={`gauge${inRed ? " hot" : ""}`}>
      <svg viewBox="0 0 400 400" role="img" aria-label={`${label}: ${value === undefined ? "no reading" : `${Math.round(value)} ${unit}`}`}>
        <defs>
          <radialGradient id={`${id}-bez`} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#4a4a52" /><stop offset=".6" stopColor="#1c1c20" /><stop offset="1" stopColor="#0b0b0d" /></radialGradient>
          <radialGradient id={`${id}-face`} cx="50%" cy="40%" r="65%"><stop offset="0" stopColor="#1b1b1f" /><stop offset="1" stopColor="#0a0a0c" /></radialGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx={C} cy={C} r="196" fill={`url(#${id}-bez)`} />
        <circle cx={C} cy={C} r="178" fill={`url(#${id}-face)`} stroke="#000" strokeWidth="2" />
        <path d={arc(ang(redFrom, max), ang(max, max), 160)} className="redzone" fill="none" />
        {minors.map((v) => { const [x0, y0] = pt(ang(v, max), 150), [x1, y1] = pt(ang(v, max), 158); return <line key={`m${v}`} x1={x0} y1={y0} x2={x1} y2={y1} className={`tk minor${v >= redFrom ? " r" : ""}`} />; })}
        {majors.map((v) => { const [x0, y0] = pt(ang(v, max), 138), [x1, y1] = pt(ang(v, max), 158), [tx, ty] = pt(ang(v, max), 116); return (
          <g key={`M${v}`}><line x1={x0} y1={y0} x2={x1} y2={y1} className={`tk major${v >= redFrom ? " r" : ""}`} /><text x={tx} y={ty + 6} textAnchor="middle" className="num">{v}</text></g>
        ); })}
        <text x={C} y={C + 62} textAnchor="middle" className="g-label">{label}</text>
        <text x={C} y={C + 118} textAnchor="middle" className="g-read">{value === undefined ? "—" : Math.round(value)}<tspan className="g-unit"> {unit}</tspan></text>
        <g className="needle" style={{ transform: `rotate(${ang(value ?? 0, max)}deg)`, transformOrigin: `${C}px ${C}px` }}>
          <polygon points={`${C - 22},${C - 3} ${C + 150},${C - 1} ${C + 150},${C + 1} ${C - 22},${C + 3}`} filter={`url(#${id}-glow)`} />
        </g>
        <circle cx={C} cy={C} r="14" className="cap" /><circle cx={C} cy={C} r="5" fill="#0b0b0d" />
      </svg>
    </figure>
  );
}

/** Recent blocks as a lit bar-graph arc with the finalized slot as the readout. */
export function SlotDial({ ticks, height }: { ticks: Pulse["ticks"]; height: bigint | undefined }) {
  const N = 56;
  return (
    <figure className="slotdial">
      <svg viewBox="0 0 560 480" role="img" aria-label={`Finalized slot ${height?.toString() ?? "loading"}`}>
        <defs><filter id="sd-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {Array.from({ length: N }, (_, i) => {
          const t = ticks[ticks.length - N + i];
          const a = 150 + (240 * i) / (N - 1);
          const len = 14 + (t ? ((t.hash[0] ?? 0) / 255) * 30 : 0);
          const x0 = 280 + Math.cos(rad(a)) * 224, y0 = 270 + Math.sin(rad(a)) * 224;
          const x1 = 280 + Math.cos(rad(a)) * (224 + len), y1 = 270 + Math.sin(rad(a)) * (224 + len);
          const now = i === N - 1 && !!t;
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className={now ? "bt now" : t ? "bt" : "bt off"} filter={now ? "url(#sd-glow)" : undefined} />;
        })}
        <text x="280" y="228" textAnchor="middle" className="s-k">FINALIZED SLOT · {NETWORK.name.toUpperCase()}</text>
        <text x="280" y="320" textAnchor="middle" className="s-v">{grouped(height)}</text>
        <text x="280" y="360" textAnchor="middle" className="s-k dim">LAST {ticks.length} BLOCKS · LENGTH = FIRST BYTE OF HASH</text>
      </svg>
    </figure>
  );
}

export function Cluster({ pulse, compact = false }: { pulse: Pulse; compact?: boolean }) {
  return (
    <div className={`cluster${compact ? " compact" : ""}`}>
      <Gauge value={pulse.latencyMs} max={500} redFrom={300} label="RPC" unit="ms" step={100} minor={20} />
      <SlotDial ticks={pulse.ticks} height={pulse.height} />
      <Gauge value={pulse.slotTimeMs} max={2000} redFrom={1500} label="BLOCK TIME" unit="ms" step={500} minor={100} />
    </div>
  );
}
