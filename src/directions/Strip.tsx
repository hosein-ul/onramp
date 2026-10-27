import { NETWORK, SITE } from "../config";
import { gaps, grouped, ms, PREVIEW_STATES, stops, type DirectionProps } from "./shared";
import "./strip.css";

const W = 1200;
const H = 340;
const PAD = { l: 56, r: 24, t: 16, b: 32 };

function Chart({ data }: { data: { slot: bigint; ms: number }[] }) {
  const peak = Math.max(0, ...data.map((d) => d.ms));
  const step = peak > 1500 ? 500 : peak > 600 ? 250 : 100;
  const Y_MAX = Math.max(step * 2, Math.ceil((peak * 1.15) / step) * step);
  const ticks = Array.from({ length: Y_MAX / step + 1 }, (_, i) => i * step);
  const n = Math.max(data.length, 2);
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.min(v, Y_MAX) / Y_MAX) * (H - PAD.t - PAD.b);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.ms).toFixed(1)}`);
  const last = data[data.length - 1];
  return (
    <svg className="sp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Time between recent blocks, in milliseconds">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={v % (step * 2) === 0 ? "major" : "minor"} />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      {data.map((d, i) => (i % 8 === 0 ? (
        <g key={d.slot.toString()}>
          <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} className="minor" />
          <text x={x(i)} y={H - 10} textAnchor="middle">{d.slot.toString().slice(-4)}</text>
        </g>
      ) : null))}
      <text x={PAD.l - 8} y={PAD.t - 4} textAnchor="end" className="unit">ms</text>
      {pts.length > 1 && <polyline points={pts.join(" ")} className="trace" fill="none" />}
      {last && (
        <g>
          <circle cx={x(data.length - 1)} cy={y(last.ms)} r="5" className="pen" />
          <text x={x(data.length - 1) - 10} y={y(last.ms) - 12} textAnchor="end" className="pen-label">{Math.round(last.ms)} ms</text>
        </g>
      )}
    </svg>
  );
}

function Channel({ state }: { state: "verified" | "ready" | "locked" }) {
  const d = state === "verified" ? "M0 20 H70 L78 4 L86 34 L94 20 H200" : state === "ready" ? "M0 20 H200" : "M0 20 H200";
  return (
    <svg viewBox="0 0 200 40" className={`sp-mini ${state}`} aria-hidden="true" preserveAspectRatio="none">
      <path d={d} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Strip({ pulse, onStart }: DirectionProps) {
  const data = gaps(pulse);
  return (
    <div className="sp">
      <header className="sp-bar">
        <span className="sp-brand">WAYPOINT <i>unofficial guide to Thru</i></span>
        <span className="sp-net">{NETWORK.name} · chain {NETWORK.chainId} · {pulse.status === "live" ? "recording" : pulse.status === "error" ? "no signal" : "waiting"}</span>
      </header>

      <section className="sp-hero">
        <div className="sp-copy">
          <h1>Learn Thru by using it.</h1>
          <p>The trace below is the network itself: the time between each of the last blocks, read from the chain a second ago. Five missions, each checked the same way.</p>
          <button type="button" className="sp-btn" onClick={onStart}>Start the trail</button>
        </div>
        <dl className="sp-read">
          <div><dt>Finalized slot</dt><dd>{grouped(pulse.height)}</dd></div>
          <div><dt>Median block time</dt><dd>{ms(pulse.slotTimeMs)}</dd></div>
          <div><dt>RPC round trip</dt><dd>{ms(pulse.latencyMs)}</dd></div>
        </dl>
        <div className="sp-paper">
          <div className="sp-cap"><span>Block interval · last {data.length} blocks</span><span>chart speed: 1 block per division</span></div>
          <Chart data={data} />
          {pulse.status === "error" && <p className="sp-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        </div>
      </section>

      <section className="sp-ch" aria-label="The trail">
        <h2>Channels</h2>
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          return (
            <button type="button" key={m.id} className={`sp-row ${st}`} onClick={onStart}>
              <span className="sp-id">CH{i + 1}</span>
              <span className="sp-name"><strong>{m.title}</strong><em>{m.goal}</em></span>
              <Channel state={st} />
              <span className="sp-reads">{m.reads}</span>
              <span className="sp-state">{st === "verified" ? "Verified" : st === "ready" ? "Ready" : "Locked"}</span>
            </button>
          );
        })}
      </section>
      <footer className="sp-foot">{SITE.disclaimer}</footer>
    </div>
  );
}
