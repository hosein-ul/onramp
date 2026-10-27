import { NETWORK, SITE } from "../config";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps } from "./shared";
import "./index.css";

const LABEL = { verified: "Verified", ready: "Ready", locked: "Locked" } as const;

export function Index({ pulse, onStart }: DirectionProps) {
  return (
    <div className="ix">
      <header className="ix-bar">
        <span className="ix-brand">Waypoint</span>
        <span>
          {NETWORK.name} <b className={pulse.status === "live" ? "on" : ""}>{pulse.status === "live" ? "Live" : pulse.status === "error" ? "Offline" : "…"}</b>
        </span>
        <span>Block time <b>{ms(pulse.slotTimeMs)}</b></span>
        <span>RPC <b>{ms(pulse.latencyMs)}</b></span>
        <button type="button" className="ix-link" onClick={onStart}>Start the trail →</button>
      </header>

      <section className="ix-hero">
        <p className="ix-kicker">Finalized slot</p>
        <div className="ix-num" aria-label={`Slot ${pulse.height?.toString() ?? "loading"}`}>{grouped(pulse.height)}</div>
        {pulse.status === "error" && <p className="ix-err" role="alert">{pulse.error ?? "The network did not answer."} Retrying. Nothing here is simulated.</p>}
        <div className="ix-cols">
          <h1>Learn Thru by using it.</h1>
          <p>Five short missions on a live network. Each one is checked against the chain, so the progress you see really happened.</p>
          <p className="ix-small">An unofficial guide.<br />About 10 minutes.<br />Nothing stored on a server.</p>
        </div>
      </section>

      <section className="ix-trail" aria-label="The trail">
        <div className="ix-head"><span>No.</span><span>Mission</span><span>The chain read behind the check</span><span>State</span></div>
        {stops.map((m, i) => {
          const st = PREVIEW_STATES[i] ?? "locked";
          return (
            <button type="button" className={`ix-row ${st}`} key={m.id} onClick={onStart}>
              <span className="ix-n">{i + 1}</span>
              <span className="ix-t"><strong>{m.title}</strong><em>{m.goal}</em></span>
              <span className="ix-r">{m.reads}</span>
              <span className="ix-s">{LABEL[st]}</span>
            </button>
          );
        })}
      </section>
      <footer className="ix-foot">{SITE.disclaimer}</footer>
    </div>
  );
}
