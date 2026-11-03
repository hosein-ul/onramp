import { useEffect } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { makeReceipt, receiptLink } from "../receipts/receipt";
import { stopStates } from "../trail/progress";
import { useTrail } from "../trail/useTrail";
import { Cluster } from "../ui/Cluster";
import { MissionKey } from "../ui/MissionKey";
import { MissionPanel } from "../ui/MissionPanel";
import { short } from "../ui/format";
import { connectWallet, initWallet, useWallet } from "../wallet/wallet";

export function TrailPage({ pulse, openId }: { pulse: Pulse; openId?: string }) {
  const w = useWallet();
  const trail = useTrail(w.address);
  const missions = MISSIONS_V1.missions;
  useEffect(() => { initWallet(); }, []);
  const open = missions.findIndex((m) => m.id === openId);
  const total = missions.length;
  const anyError = Object.values(trail.statuses).some((s) => s.state === "error");
  const states = stopStates(missions, trail.statuses);
  const next = states.findIndex((s) => s !== "done");
  const nextMission = next >= 0 ? missions[next] : undefined;
  const complete = trail.verifiedCount === total;
  return (
    <>
      <section className="trail-head">
        <div>
          <p className="eyebrow">Sheet 2 · Schedule · {NETWORK.name}</p>
          <h1 className="h1s">{complete ? "Trail complete." : "Five stops."}</h1>
        </div>
        <div className="progress" role="img" aria-label={`${trail.verifiedCount} of ${total} missions verified on-chain`}>
          <div className="led">{missions.map((m) => <i key={m.id} className={trail.statuses[m.id]?.state === "verified" ? "verified" : trail.statuses[m.id]?.state === "ready" ? "ready" : ""} />)}</div>
          <span>{trail.verifiedCount} of {total} verified on-chain</span>
        </div>
      </section>
      <Cluster pulse={pulse} compact />

      {!w.address && (
        <div className="banner" role="status">
          <span>Connect a wallet to begin. Mission 1 creates one with a passkey, in under a minute.</span>
          <button type="button" className="btn primary small" onClick={() => void connectWallet()} disabled={w.phase === "connecting" || w.phase === "starting"}>{w.phase === "connecting" ? "Connecting…" : "Connect wallet"}</button>
        </div>
      )}
      {w.phase === "unavailable" && <p className="banner bad" role="alert">{w.error ?? "The wallet could not start."}</p>}
      {anyError && <p className="banner bad" role="alert">Some results could not be read from the network. That does not mean a mission is not done. <button type="button" className="link" onClick={() => void trail.refreshAll()}>Read again</button></p>}

      {w.address && nextMission && (
        <div className="next-bar" role="status">
          <span className="k">Next stop {String(next + 1).padStart(2, "0")}</span>
          <div><h3>{nextMission.title}</h3><p>{nextMission.goal}</p></div>
          <a className="btn primary" href={`#/trail/${nextMission.id}`}>Continue</a>
        </div>
      )}
      {complete && (
        <div className="next-bar done" role="status">
          <span className="k">All stops verified</span>
          <div><h3>You have walked the whole trail.</h3><p>Five results, each read from the chain. The receipts below can be shared; opening one re-reads the network.</p></div>
        </div>
      )}

      <section className="panelrow" aria-label="Missions">
        {missions.map((m, i) => (
          <MissionKey key={m.id} mission={m} index={i} status={trail.statuses[m.id] ?? { state: "checking" }} onOpen={() => { window.location.hash = `/trail/${m.id}`; }} />
        ))}
      </section>
      {w.address && <p className="refresh"><button type="button" className="link" onClick={() => void trail.refreshAll()}>Re-read everything from the chain</button></p>}

      {complete && (
        <section className="complete" aria-label="Completion sheet">
          <header><div><p className="eyebrow">Completion sheet</p><h2>Trail complete</h2></div><span className="pill verified">5 of 5 verified</span></header>
          <ol>
            {missions.map((m, i) => {
              const e = trail.statuses[m.id]?.evidence;
              const r = e ? makeReceipt(m.id, m.title, e, m.id === "token-account" || m.id === "token-transfer" ? trail.thrusd?.tokenAccount : undefined) : null;
              return <li key={m.id}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{m.title}</b><br /><code>{e?.signature ? short(e.signature, 10, 8) : "state read from the chain"}</code></div>{r && <a className="btn ghost tiny" href={receiptLink(r)}>Open receipt</a>}</li>;
            })}
          </ol>
        </section>
      )}

      {open >= 0 && missions[open] && (
        <MissionPanel mission={missions[open]} index={open} status={trail.statuses[missions[open].id] ?? { state: "checking" }} trail={trail} onClose={() => { window.location.hash = "/trail"; }} />
      )}
    </>
  );
}
