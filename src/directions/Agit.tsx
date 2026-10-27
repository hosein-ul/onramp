import { NETWORK, SITE } from "../config";
import { shorten, toHex } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stateLabel, stops, type DirectionProps } from "./shared";
import "./agit.css";

/** The last blocks as radial ticks around a dial. Tick length is the first byte of the block hash. */
function Dial({ ticks, latency }: { ticks: { slot: bigint; hash: Uint8Array }[]; latency: number | undefined }) {
  const N = 56, C = 400, R = 300;
  return (
    <svg className="ag-dial" viewBox="0 0 800 800" role="img" aria-label={`The ${ticks.length} most recent blocks, drawn as ticks around a circle`}>
      <circle cx={C} cy={C} r="396" className="disc" />
      <circle cx={C} cy={C} r="268" className="ring" fill="none" />
      {Array.from({ length: N }, (_, i) => {
        const t = ticks[ticks.length - N + i];
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        const len = t ? 18 + ((t.hash[0] ?? 0) / 255) * 70 : 8;
        const isNew = i === N - 1 && !!t;
        const x1 = C + Math.cos(a) * R, y1 = C + Math.sin(a) * R, x2 = C + Math.cos(a) * (R + len), y2 = C + Math.sin(a) * (R + len);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={isNew ? "tick now" : t ? "tick" : "tick off"} />;
      })}
      <text x={C} y={C - 120} textAnchor="middle" className="d-k">RPC</text>
      <text x={C} y={C + 62} textAnchor="middle" className="d-v">{latency === undefined ? "—" : Math.round(latency)}</text>
      <text x={C} y={C + 104} textAnchor="middle" className="d-u">milliseconds</text>
    </svg>
  );
}

const SWATCHES = [
  { n: "Signal red", v: "#E3101E", u: "The field. Large areas only.", c: "#E3101E", ink: "#fff" },
  { n: "Press black", v: "#0B0B0B", u: "Type, circles, rules.", c: "#0B0B0B", ink: "#fff" },
  { n: "Sheet white", v: "#F4F5F5", u: "Reading surfaces.", c: "#F4F5F5", ink: "#0B0B0B" },
  { n: "Proof grey", v: "#B7BBBB", u: "Locked and secondary.", c: "#B7BBBB", ink: "#0B0B0B" },
  { n: "Verified green", v: "#14A35E", u: "Only a verified fact.", c: "#14A35E", ink: "#fff" },
];

export function Agit({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const verified = PREVIEW_STATES.filter((s) => s === "verified").length;
  return (
    <div className="ag">
      <section className="ag-hero">
        <header className="ag-nav">
          <span className="ag-logo">WAYPOINT</span>
          <span className="ag-tag">{NETWORK.name} · {pulse.status === "live" ? "live" : pulse.status === "error" ? "no signal" : "connecting"}</span>
          <button type="button" className="ag-btn inv" onClick={onStart}>Start the trail</button>
        </header>
        <div className="ag-wedge" aria-hidden="true" />
        <p className="ag-num" aria-label={`Finalized slot ${pulse.height?.toString() ?? "loading"}`}>{grouped(pulse.height)}</p>
        <p className="ag-num-cap">Finalized slot · {NETWORK.name}</p>
        <Dial ticks={pulse.ticks} latency={pulse.latencyMs} />
        <div className="ag-band">
          <h1>Learn Thru<br />by using it.</h1>
        </div>
        <div className="ag-sub">
          <p>Five missions on the live network. The chain checks every one, so progress is never claimed, only recorded.</p>
          <button type="button" className="ag-btn" onClick={onStart}>Start the trail <span aria-hidden="true">→</span></button>
        </div>
        {pulse.status === "error" && <p className="ag-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
      </section>

      <section className="ag-sys" aria-label="Design system preview">
        <div className="ag-sys-head"><span>Design system · v0.1</span><span>Agit</span></div>

        <div className="ag-row">
          <h2>Colour</h2>
          <div className="ag-sw">{SWATCHES.map((s) => (
            <div key={s.n} className="ag-s" style={{ background: s.c, color: s.ink }}><strong>{s.n}</strong><code>{s.v}</code><small>{s.u}</small></div>
          ))}</div>
        </div>

        <div className="ag-row">
          <h2>Type</h2>
          <div className="ag-type">
            <div className="ag-spec a"><span className="aa">Aa</span><p>Archivo Expanded 900<br />Headlines. Uppercase. Wide, so it reads as a statement.</p></div>
            <div className="ag-spec b"><span className="aa cond">3,110,092</span><p>Archivo Condensed 900<br />Numbers. Tall and narrow, so a slot fits a whole edge.</p></div>
            <div className="ag-spec c"><span className="aa mono">GetAccount</span><p>IBM Plex Mono 500<br />Chain terms and signatures. Always monospace.</p></div>
          </div>
        </div>

        <div className="ag-row">
          <h2>Components</h2>
          <div className="ag-comp">
            <div className="ag-box"><p className="ag-k">Buttons</p><div className="ag-stack"><button className="ag-btn" type="button">Verify →</button><button className="ag-btn ghost" type="button">View receipt</button><button className="ag-btn" type="button" disabled>Locked</button></div></div>
            <div className="ag-box"><p className="ag-k">Progress</p><div className="ag-steps" role="img" aria-label={`${verified} of 5 verified`}>{PREVIEW_STATES.map((s, i) => <i key={i} className={s} style={{ height: `${28 + i * 14}px` }} />)}</div><p className="ag-mut">{verified} of 5, rising left to right</p></div>
            <div className="ag-box wide"><p className="ag-k">Mission tile</p>
              <div className="ag-tiles">{stops.slice(0, 3).map((m, i) => { const st = PREVIEW_STATES[i] ?? "locked"; return (
                <article key={m.id} className={`ag-tile ${st}`}><span className="n">{i + 1}</span><h3>{m.title}</h3><p>{m.reads}</p><em>{stateLabel[st]}</em></article>
              ); })}</div>
            </div>
            <div className="ag-box"><p className="ag-k">Receipt</p>
              <div className="ag-rcpt"><div className="ag-b">VERIFIED ON-CHAIN</div><dl><dt>Slot</dt><dd>{grouped(pulse.height)}</dd><dt>Block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd><dt>Network</dt><dd>{NETWORK.name}</dd></dl></div>
            </div>
          </div>
        </div>

        <div className="ag-row ag-rules">
          <h2>Rules</h2>
          <ol>
            <li>Red is a field, never a highlight. If it is small, it is wrong.</li>
            <li>Every composition has one diagonal. Nothing else is tilted.</li>
            <li>Numbers come from the chain and are set big. Words are set small.</li>
            <li>Green appears only next to a fact the chain confirmed.</li>
          </ol>
        </div>
      </section>
      <footer className="ag-foot">{SITE.disclaimer} · {ms(pulse.slotTimeMs)} block time</footer>
    </div>
  );
}
