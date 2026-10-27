import { NETWORK, SITE } from "../config";
import { MISSIONS_V1 } from "../../missions/v1";
import { shorten, toHex } from "../lib/bytes";
import type { Pulse } from "../chain/useChainPulse";
import { Contours } from "./Contours";
import { Tape } from "./Tape";

function slotParts(height: bigint | undefined): { lead: string; tail: string } {
  if (height === undefined) return { lead: "—", tail: "" };
  const s = height.toString().padStart(7, "0");
  const grouped = Number(height).toLocaleString("en-US");
  return { lead: grouped.slice(0, Math.max(0, grouped.length - 2)), tail: s.slice(-2) };
}

function fmtMs(n: number | undefined): string {
  return n === undefined ? "—" : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`;
}

export function Landing({ pulse, onStart }: { pulse: Pulse; onStart: () => void }) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const seedTick = pulse.ticks.find((t) => t.slot % 64n === 0n) ?? pulse.ticks[0];
  const { lead, tail } = slotParts(pulse.height);
  const stops = MISSIONS_V1.missions;

  return (
    <div className="page">
      <header className="topbar">
        <a className="logo" href="#" aria-label="Waypoint home">
          <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
            <path d="M5 25 L13 14 L19 19 L27 6" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="27" cy="6" r="2.6" fill="currentColor" />
          </svg>
          <span>WAYPOINT</span>
        </a>
        <div className="topbar-right">
          <span className="chip net" data-state={pulse.status}>
            <i className="dot" />
            {NETWORK.name}
            <span className="chip-sub">{pulse.status === "live" ? "live" : pulse.status === "error" ? "offline" : "connecting"}</span>
          </span>
        </div>
      </header>

      <section className="hero">
        <Contours seed={seedTick?.hash} />
        <div className="hero-copy">
          <p className="eyebrow">An unofficial guide to Thru</p>
          <h1>
            Learn Thru
            <br />
            by using&nbsp;it.
          </h1>
          <p className="lede">
            Five short missions on a live network. Each one is checked against the chain itself, so the progress you see is
            something that really happened.
          </p>
          <div className="cta-row">
            <button className="btn primary" type="button" onClick={onStart}>
              Start the trail
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <span className="fine">About 10 minutes · no sign-up · nothing stored on a server</span>
          </div>
        </div>

        <div className="panel" aria-live="off">
          <div className="panel-head">
            <span className="label">Finalized slot · {NETWORK.name}</span>
            <span className={`status ${pulse.status}`}>{pulse.status === "live" ? "Reading the chain live" : pulse.status === "error" ? "Cannot reach the network" : "Connecting"}</span>
          </div>
          <div className="slot" aria-label={pulse.height ? `Slot ${pulse.height.toString()}` : "Loading"}>
            <span className="slot-lead">{lead}</span>
            <span className="slot-tail">{tail}</span>
          </div>
          {pulse.status === "error" && (
            <p className="inline-error" role="alert">
              {pulse.error ?? "The network did not answer."} Waypoint keeps retrying. Nothing here is simulated.
            </p>
          )}
          <Tape ticks={pulse.ticks} />
          <dl className="readouts">
            <div>
              <dt>Block time</dt>
              <dd>{fmtMs(pulse.slotTimeMs)}</dd>
            </div>
            <div>
              <dt>RPC round trip</dt>
              <dd>{fmtMs(pulse.latencyMs)}</dd>
            </div>
            <div>
              <dt>Latest block</dt>
              <dd>{latest ? shorten(toHex(latest.hash), 6, 4) : "—"}</dd>
            </div>
            <div>
              <dt>Chain ID</dt>
              <dd>{NETWORK.chainId}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="route" aria-labelledby="route-h">
        <div className="section-head">
          <h2 id="route-h">The trail</h2>
          <p>Each stop is a thing you do once. Each check is a read from the network, listed below the stop.</p>
        </div>
        <div className="route-map">
          <ol className="stops">
            {stops.map((m, i) => (
              <li key={m.id} className="stop" style={{ "--i": i } as React.CSSProperties}>
                <span className="node" aria-hidden="true" />
                <span className="stop-n">STOP {i + 1}</span>
                <h3>{m.title}</h3>
                <p>{m.goal}</p>
                <span className="reads">{m.reads}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="trust" aria-labelledby="trust-h">
        <div className="trust-copy">
          <h2 id="trust-h">Nothing to take on trust</h2>
          <ul>
            <li>
              <strong>We read, you act.</strong> Waypoint never moves your funds and never holds a key. The official Thru wallet signs, on your device.
            </li>
            <li>
              <strong>The chain is the scorekeeper.</strong> Progress is recomputed from on-chain data every visit. There is no server and no database to fake it.
            </li>
            <li>
              <strong>Receipts you can check.</strong> Every verified mission gives you a card with the transaction signature, the slot and a link to the explorer.
            </li>
          </ul>
        </div>
        <figure className="wire" aria-label="A live example of the reads Waypoint performs">
          <figcaption className="label">A live read, from your browser</figcaption>
          <pre>
            <span className="c">{`POST ${NETWORK.rpcUrl.replace("https://", "")}`}</span>
            {"\n"}
            <span className="c">thru.services.v1.QueryService/</span>GetHeight{"\n"}
            <span className="arrow">→</span> finalized <b>{pulse.height ? pulse.height.toLocaleString("en-US") : "…"}</b>
            {"   "}
            <span className="ms">{fmtMs(pulse.latencyMs)}</span>
            {"\n\n"}
            <span className="c">thru.services.v1.QueryService/</span>GetBlock{"\n"}
            <span className="arrow">→</span> hash <b>{latest ? shorten(toHex(latest.hash), 10, 8) : "…"}</b>
          </pre>
        </figure>
      </section>

      <footer className="footer">
        <p>{SITE.disclaimer}</p>
        <p>
          Built on the official <span className="mono">@thru/*</span> packages (Apache-2.0). Test network only. Fees and network rules may change.
        </p>
      </footer>
    </div>
  );
}
