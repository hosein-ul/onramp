import { useEffect } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import type { Pulse } from "../chain/useChainPulse";
import { makeReceipt, receiptLink } from "../receipts/receipt";
import { stopStates } from "../trail/progress";
import { useTrail } from "../trail/useTrail";
import { Cluster } from "../ui/Cluster";
import { MissionIndex } from "../ui/MissionIndex";
import { MissionPanel } from "../ui/MissionPanel";
import { Stamp } from "../ui/stamp";
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
      <section style={{ padding: "64px 0 28px" }}>
        <p className="eyebrow">The trail</p>
        <h1 className="h1s" style={{ marginTop: 14 }}>{complete ? "Five stamps. Trail complete." : "Collect five stamps."}</h1>
        <div className="progressline" role="img" aria-label={`${trail.verifiedCount} of ${total} missions verified on-chain`}>
          <span className="led">{missions.map((m) => <i key={m.id} className={trail.statuses[m.id]?.state === "verified" ? "verified" : trail.statuses[m.id]?.state === "ready" ? "ready" : ""} />)}</span>
          <span>{trail.verifiedCount} of {total} verified on-chain</span>
        </div>
      </section>
      <Cluster pulse={pulse} />

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
          <span className="k">Next · mission {next + 1}</span>
          <div><h3>{nextMission.title}</h3><p>{nextMission.goal}</p></div>
          <a className="btn primary" href={`#/trail/${nextMission.id}`}>Continue</a>
        </div>
      )}
      {complete && (
        <div className="next-bar done" role="status">
          <span className="k">All verified</span>
          <div><h3>You have walked the whole trail.</h3><p>Five results, each read from the chain. Open any receipt to share it; whoever opens it re-reads the network.</p></div>
          <a className="btn" href="#/lab">Open the Lab</a>
        </div>
      )}

      <div style={{ marginTop: 28 }}><MissionIndex missions={missions} trail={trail} /></div>
      {w.address && <p className="refresh"><button type="button" className="link" onClick={() => void trail.refreshAll()}>Re-read everything from the chain</button></p>}

      {complete && (
        <section className="passport" aria-label="Your stamps">
          <header><div><p className="eyebrow">Passport</p><h2>Five stamps.</h2></div><span className="pill verified">5 of 5 verified</span></header>
          <div className="stamps">
            {missions.map((m, i) => {
              const e = trail.statuses[m.id]?.evidence;
              if (!e) return <div key={m.id} />;
              const r = makeReceipt(m.id, m.title, e, m.id === "token-account" || m.id === "token-transfer" ? trail.thrusd?.tokenAccount : undefined);
              return (
                <div key={m.id}>
                  <Stamp seed={e.signature ?? `${e.address}:${m.id}`} label={`${String(i + 1).padStart(2, "0")} · VERIFIED`} width={120} />
                  <b>{m.title}</b><code>{e.signature ? short(e.signature, 8, 6) : "state read from the chain"}</code>
                  <a className="btn ghost tiny" href={receiptLink(r)}>Open receipt</a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {open >= 0 && missions[open] && (
        <MissionPanel mission={missions[open]} index={open} status={trail.statuses[missions[open].id] ?? { state: "checking" }} trail={trail} onClose={() => { window.location.hash = "/trail"; }} />
      )}
    </>
  );
}
