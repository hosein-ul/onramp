import { useEffect, useRef } from "react";
import { NETWORK, SITE } from "../config";
import { shorten, toHex } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stateLabel, stops, type DirectionProps } from "./shared";
import "./overprint.css";

/** A halftone screen: a rotated grid of dots whose size follows a gradient. The way a riso drum prints tone. */
function Halftone({ color = "#e8323c", angle = 22, step = 9, from = [1, 1], className = "" }: { color?: string; angle?: number; step?: number; from?: [number, number]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.floor(r.width * dpr)); c.height = Math.max(1, Math.floor(r.height * dpr));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.fillStyle = color;
      const th = (angle * Math.PI) / 180, cos = Math.cos(th), sin = Math.sin(th);
      const diag = Math.hypot(r.width, r.height);
      const [fx, fy] = from;
      const ox = fx > 0 ? r.width : 0, oy = fy > 0 ? r.height : 0;
      for (let u = -diag; u < diag; u += step) {
        for (let v = -diag; v < diag; v += step) {
          const x = r.width / 2 + u * cos - v * sin, y = r.height / 2 + u * sin + v * cos;
          if (x < -step || y < -step || x > r.width + step || y > r.height + step) continue;
          const t = 1 - Math.hypot(x - ox, y - oy) / diag; // 1 at the origin corner, 0 far away
          const rad = Math.max(0, t - 0.15) * 1.25 * step * 0.62;
          if (rad < 0.35) continue;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(c);
    return () => ro.disconnect();
  }, [color, angle, step, from]);
  return <canvas ref={ref} className={`op-ht ${className}`} aria-hidden="true" />;
}

/** The last blocks as overlapping discs, alternating inks. Overlaps print darker, as they would on paper. */
function Discs({ ticks }: { ticks: { slot: bigint; hash: Uint8Array }[] }) {
  const n = 26;
  return (
    <svg className="op-discs" viewBox="0 0 780 120" role="img" aria-label={`The ${ticks.length} most recent blocks as overlapping discs`}>
      {Array.from({ length: n }, (_, i) => {
        const t = ticks[ticks.length - n + i];
        const r = t ? 12 + ((t.hash[0] ?? 0) / 255) * 40 : 6;
        const isNew = i === n - 1 && !!t;
        return <circle key={i} cx={34 + i * 28.5} cy={60} r={r} className={isNew ? "op-now" : i % 2 ? "op-k" : "op-r"} />;
      })}
    </svg>
  );
}

const INKS = [
  { n: "Paper", v: "#F7F8F8", u: "Never printed.", c: "#F7F8F8", ink: "#1b1b1b", line: true },
  { n: "Ink 1 · Red", v: "#E8323C", u: "Colour and emphasis.", c: "#E8323C", ink: "#fff" },
  { n: "Ink 2 · Black", v: "#1B1B1B", u: "Type and structure.", c: "#1B1B1B", ink: "#fff" },
  { n: "Overprint", v: "red × black", u: "Where inks cross.", c: "#7a1e24", ink: "#fff" },
  { n: "Verified", v: "#0F9D58", u: "A fact the chain confirmed.", c: "#0F9D58", ink: "#fff" },
];

export function Overprint({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const verified = PREVIEW_STATES.filter((s) => s === "verified").length;
  return (
    <div className="op">
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="op-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" /></filter>
      </svg>

      <section className="op-hero">
        <header className="op-nav">
          <span className="op-logo">Waypoint</span>
          <span className="op-chip">{NETWORK.name} · {pulse.status === "live" ? "live" : pulse.status === "error" ? "no signal" : "connecting"}</span>
          <button type="button" className="op-btn small" onClick={onStart}>Start the trail</button>
        </header>

        <Halftone className="ht-a" from={[1, 1]} />
        <div className="op-disc red" aria-hidden="true" /><div className="op-disc black" aria-hidden="true" />

        <div className="op-copy">
          <p className="op-eyebrow">An unofficial guide to Thru</p>
          <h1 data-text="Learn Thru by using it."><span>Learn Thru by using it.</span></h1>
          <p className="op-lede">Five short missions on a live network. The chain checks each one, so every stamp you collect was printed from something that really happened.</p>
          <button type="button" className="op-btn" onClick={onStart}>Start the trail</button>
        </div>

        <div className="op-slot" aria-label={`Finalized slot ${pulse.height?.toString() ?? "loading"}`}>
          <small>Finalized slot · {NETWORK.name}</small>
          <b>{grouped(pulse.height)}</b>
        </div>
        <Discs ticks={pulse.ticks} />
        {pulse.status === "error" && <p className="op-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
      </section>

      <section className="op-sheets" aria-label="The trail">
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          return (
            <article key={m.id} className={`op-sheet ${st}`} style={{ "--rot": `${[-0.8, 0.6, -0.4, 0.7, -0.6][i] ?? 0}deg`, "--lift": `${(4 - i) * 14}px` } as React.CSSProperties}>
              <i className="op-reg tl" /><i className="op-reg br" />
              <span className="op-no">{i + 1}</span>
              <h3>{m.title}</h3>
              <p>{m.goal}</p>
              <code>{m.reads}</code>
              <em>{stateLabel[st]}</em>
              {st === "verified" && <span className="op-seal" aria-hidden="true">Verified</span>}
            </article>
          );
        })}
      </section>

      <section className="op-sys" aria-label="Design system preview">
        <div className="op-sys-head"><span>Design system · v0.1</span><span>Overprint</span></div>
        <div className="op-row"><h2>Inks</h2>
          <div className="op-inks">{INKS.map((s) => <div key={s.n} className={`op-ink${s.line ? " line" : ""}`} style={{ background: s.c, color: s.ink }}><strong>{s.n}</strong><code>{s.v}</code><small>{s.u}</small></div>)}</div>
        </div>
        <div className="op-row"><h2>Type</h2>
          <div className="op-types">
            <div><span className="t1">Aa</span><p>Bricolage Grotesque 800<br />Headlines. Ink traps and uneven widths keep it human.</p></div>
            <div><span className="t2">3,110,507</span><p>Bricolage outline + halftone fill<br />Numbers from the chain. Printed as tone, not flat colour.</p></div>
            <div><span className="t3">GetAccount</span><p>DM Mono 500<br />Chain terms and signatures.</p></div>
          </div>
        </div>
        <div className="op-row"><h2>Parts</h2>
          <div className="op-parts">
            <div><p className="op-k">Button</p><button className="op-btn" type="button">Verify</button></div>
            <div><p className="op-k">Progress</p><div className="op-dots" role="img" aria-label={`${verified} of 5 verified`}>{PREVIEW_STATES.map((s, i) => <i key={i} className={s} />)}</div></div>
            <div><p className="op-k">Receipt</p><div className="op-slip"><i className="op-reg tl" /><i className="op-reg br" /><strong>VERIFIED ON-CHAIN</strong><dl><dt>Slot</dt><dd>{grouped(pulse.height)}</dd><dt>Block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd></dl></div></div>
          </div>
        </div>
        <div className="op-row op-rules"><h2>Rules</h2>
          <ol>
            <li>Two inks only. Every other tone is made from dots of those two.</li>
            <li>Nothing lines up perfectly. A 3 to 5 pixel misregistration is the signature.</li>
            <li>Overlap is the only effect. Where inks cross, the result is darker, never new.</li>
            <li>Green appears only next to a fact the chain confirmed.</li>
          </ol>
        </div>
      </section>
      <footer className="op-foot">{SITE.disclaimer} · {ms(pulse.slotTimeMs)} block time</footer>
    </div>
  );
}
