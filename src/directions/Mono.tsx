import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { NETWORK, SITE } from "../config";
import { shorten, toHex } from "../lib/bytes";
import { DitherField, Icon, Odometer, Ring, Sparkline } from "./monoParts";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps } from "./shared";
import "./mono.css";

/** A bordered surface with a cursor spotlight and print registration marks. */
function Tile({ className = "", children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  const move = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return <section className={`tile ${className}`} style={style} onPointerMove={move}>{children}</section>;
}

const CHIP = { verified: "Verified", ready: "Your turn", locked: "Locked" } as const;

export function Mono({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const seed = (pulse.ticks.find((t) => t.slot % 64n === 0n) ?? latest)?.hash;
  const verified = PREVIEW_STATES.filter((s) => s === "verified").length;
  const live = pulse.status === "live";

  return (
    <div className="mn">
      <header className="mn-nav">
        <a className="mn-logo" href="#" aria-label="Waypoint home">
          <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true"><path d="M5 25 L13 14 L19 19 L27 6" fill="none" stroke="currentColor" strokeWidth="2.6" /><circle cx="27" cy="6" r="2.8" fill="currentColor" /></svg>
          WAYPOINT
        </a>
        <span className="mn-chip"><i className={`mn-dot ${pulse.status}`} />{NETWORK.name}<em>{live ? "live" : pulse.status === "error" ? "offline" : "connecting"}</em></span>
        <span className="mn-chip dim">Unofficial community project</span>
        <button type="button" className="mn-btn small" onClick={onStart}>Start the trail</button>
      </header>

      <main className="mn-grid">
        <Tile className="hero">
          <DitherField seed={seed} height={pulse.height} />
          <div className="hero-in">
            <p className="eyebrow">An unofficial guide to Thru</p>
            <h1>Learn Thru<br />by using&nbsp;it.</h1>
            <p className="lede">Five short missions on a live network. Each one is checked against the chain itself, so the progress you see is something that really happened.</p>
            <div className="cta">
              <button type="button" className="mn-btn" onClick={onStart}>Start the trail<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></button>
              <span className="fine">~10 min · no sign-up · nothing stored on a server</span>
            </div>
          </div>
        </Tile>

        <Tile className="slot">
          <p className="lab">Finalized slot</p>
          <div className="slot-n">{pulse.height === undefined ? <span className="od-wait">—</span> : <Odometer value={grouped(pulse.height)} />}</div>
          <div className="tape" role="img" aria-label={`The ${pulse.ticks.length} most recent blocks`}>
            {Array.from({ length: 48 }, (_, i) => {
              const t = pulse.ticks[pulse.ticks.length - 48 + i];
              return <i key={i} className={t ? (i === 47 ? "now" : "") : "off"} style={{ height: `${t ? 22 + ((t.hash[0] ?? 0) / 255) * 78 : 6}%` }} />;
            })}
          </div>
          <p className="cap"><span>bar height = first byte of the block hash</span><span>now</span></p>
          {pulse.status === "error" && <p className="err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        </Tile>

        <Tile className="lat">
          <div className="lat-top"><p className="lab">RPC round trip</p><p className="big">{ms(pulse.latencyMs)}</p></div>
          <Sparkline data={pulse.latencies} />
          <dl className="mini">
            <div><dt>Block time</dt><dd>{ms(pulse.slotTimeMs)}</dd></div>
            <div><dt>Latest block</dt><dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd></div>
            <div><dt>Chain</dt><dd>{NETWORK.chainId}</dd></div>
          </dl>
        </Tile>

        <div className="sec-head">
          <div><p className="lab">The trail</p><h2>Five stops. Each one verified by the chain.</h2></div>
          <Ring filled={verified} />
        </div>

        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          return (
            <Tile key={m.id} className={`m ${st} m${i + 1}`}>
              <div className="m-top"><span className="m-n">{String(i + 1).padStart(2, "0")}</span><Icon id={m.id} /></div>
              <h3>{m.title}</h3>
              <p className="goal">{m.goal}</p>
              <p className="reads">{m.reads}</p>
              <div className="m-foot">
                <span className={`pill ${st}`}>{CHIP[st]}</span>
                <button type="button" className="mn-btn ghost" onClick={onStart} disabled={st === "locked"}>{st === "verified" ? "View receipt" : st === "ready" ? "Open mission" : "Locked"}</button>
              </div>
            </Tile>
          );
        })}

        <Tile className="wire">
          <p className="lab">A live read, from your browser</p>
          <pre>
            <span className="c">{`POST ${NETWORK.rpcUrl.replace("https://", "")}`}</span>{"\n"}
            <span className="c">QueryService/</span>GetHeight{"\n"}
            <span className="a">→</span> finalized <b>{grouped(pulse.height)}</b>{"  "}<span className="c">{ms(pulse.latencyMs)}</span>{"\n\n"}
            <span className="c">QueryService/</span>GetBlock{"\n"}
            <span className="a">→</span> hash <b>{latest ? shorten(toHex(latest.hash), 10, 8) : "…"}</b>
          </pre>
        </Tile>
        <Tile className="why"><p className="lab">We read, you act</p><p>Waypoint never holds a key or moves funds. The official Thru wallet signs on your device.</p></Tile>
        <Tile className="why"><p className="lab">The chain keeps score</p><p>Progress is recomputed from on-chain data on every visit. There is no server and no database.</p></Tile>
      </main>

      <footer className="mn-foot"><span>{SITE.disclaimer}</span><span>Built on the official @thru/* packages · Test network only</span></footer>
    </div>
  );
}
