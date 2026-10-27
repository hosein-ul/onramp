import { NETWORK, SITE } from "../config";
import { shorten } from "../lib/bytes";
import { grouped, ms, PREVIEW_STATES, stops, type DirectionProps } from "./shared";
import "./unit.css";

/** Barcode whose bars are the bytes of a real block hash. */
function Barcode({ hash }: { hash: Uint8Array | undefined }) {
  const bytes = hash ?? new Uint8Array(32);
  let x = 0;
  const bars: JSX.Element[] = [];
  bytes.forEach((b, i) => {
    const w = 1 + (b % 3);
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height="28" />);
    x += w + 1;
  });
  return <svg className="u-bars" viewBox={`0 0 ${x} 28`} preserveAspectRatio="none" aria-hidden="true">{bars}</svg>;
}

function Receipt({ hash, slot, address }: { hash: Uint8Array | undefined; slot: string; address: string }) {
  return (
    <div className="u-paper" aria-label="Sample receipt">
      <p className="u-p-h">WAYPOINT</p>
      <p className="u-p-s">RECEIPT · MISSION 02</p>
      <hr />
      <dl>
        <dt>MISSION</dt><dd>Get test funds</dd>
        <dt>ADDRESS</dt><dd>{address}</dd>
        <dt>SLOT</dt><dd>{slot}</dd>
        <dt>NETWORK</dt><dd>{NETWORK.name}</dd>
        <dt>STATUS</dt><dd className="ok">VERIFIED ON-CHAIN</dd>
      </dl>
      <Barcode hash={hash} />
      <p className="u-p-f">SAMPLE · REAL ONES SHOW YOUR TX SIGNATURE</p>
    </div>
  );
}

export function Unit({ pulse, onStart }: DirectionProps) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const t = pulse.ticks;
  const live = pulse.status === "live";
  return (
    <div className="u">
      <div className="u-device">
        <div className="u-top">
          <span className="u-sil">WAYPOINT · UNIT 01</span>
          <span className="u-grill" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} />)}</span>
          <span className="u-sil">UNOFFICIAL GUIDE TO THRU</span>
        </div>

        <div className="u-main">
          <section className="u-lcd" aria-label="Live network readout">
            <div className="u-lcd-row"><span>{NETWORK.name.toUpperCase()}</span><span className={`u-live ${pulse.status}`}>{live ? "LIVE" : pulse.status === "error" ? "NO SIGNAL" : "WAIT"}</span></div>
            <div className="u-slot" aria-label={`Slot ${pulse.height?.toString() ?? "loading"}`}>{grouped(pulse.height)}</div>
            <div className="u-lcd-cap">FINALIZED SLOT</div>
            <div className="u-tape" aria-hidden="true">
              {Array.from({ length: 56 }, (_, i) => {
                const tk = t[t.length - 56 + i];
                return <i key={i} className={i === 55 && tk ? "now" : tk ? "" : "off"} style={{ height: `${tk ? 25 + ((tk.hash[0] ?? 0) / 255) * 75 : 8}%` }} />;
              })}
            </div>
            <div className="u-lcd-row u-small"><span>BLOCK {ms(pulse.slotTimeMs)}</span><span>RPC {ms(pulse.latencyMs)}</span><span>CHAIN {NETWORK.chainId}</span></div>
            {pulse.status === "error" && <p className="u-err" role="alert">{pulse.error ?? "The network did not answer."} RETRYING.</p>}
          </section>

          <section className="u-panel">
            <h1>Learn Thru by using it.</h1>
            <p>Five short missions on a live network. Press a key, do the thing, and the chain itself checks your work.</p>
            <button type="button" className="u-key big" onClick={onStart}><span>Start the trail</span></button>
            <p className="u-fine">About 10 minutes · no sign-up · nothing stored on a server</p>
          </section>
        </div>

        <section className="u-carts" aria-label="The trail">
          {stops.map((m, i) => {
            const st = PREVIEW_STATES[i] ?? "locked";
            return (
              <article key={m.id} className={`u-cart ${st}`}>
                <header><span className="u-no">{String(i + 1).padStart(2, "0")}</span><i className="u-led" aria-hidden="true" /></header>
                <h2>{m.title}</h2>
                <p>{m.goal}</p>
                <small>READS · {m.reads}</small>
                <button type="button" className={`u-key ${st}`} disabled={st === "locked"} onClick={onStart}><span>{st === "verified" ? "Verified" : st === "ready" ? "Verify" : "Locked"}</span></button>
              </article>
            );
          })}
        </section>

        <div className="u-slotbar" aria-hidden="true"><span>PRINTER</span></div>
        <div className="u-out"><Receipt hash={latest?.hash} slot={pulse.height ? pulse.height.toString() : "—"} address={shorten("taknSJFeHXH6_PBTftg342PFFWakw1gD0QVoQrBlxcjuUa", 8, 6)} /></div>
      </div>
      <p className="u-foot">{SITE.disclaimer}</p>
    </div>
  );
}
