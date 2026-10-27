import { MISSIONS_V1 } from "../../missions/v1";
import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import type { Trail } from "../trail/useTrail";
import { Cluster } from "../ui/Cluster";
import { MissionKey } from "../ui/MissionKey";
import { MissionPanel } from "../ui/MissionPanel";
import { connectWallet, useWallet } from "../wallet/wallet";

export function TrailPage({ pulse, trail, openId }: { pulse: Pulse; trail: Trail; openId?: string }) {
  const w = useWallet();
  const missions = MISSIONS_V1.missions;
  const open = missions.findIndex((m) => m.id === openId);
  const total = missions.length;
  const anyError = Object.values(trail.statuses).some((s) => s.state === "error");
  return (
    <>
      <section className="trail-head">
        <div>
          <p className="eyebrow">The trail · {NETWORK.name}</p>
          <h1 className="h1s">{trail.verifiedCount === total ? "Trail complete." : "Five stops."}</h1>
        </div>
        <div className="progress" role="img" aria-label={`${trail.verifiedCount} of ${total} missions verified on-chain`}>
          <div className="led">{missions.map((m) => <i key={m.id} className={trail.statuses[m.id]?.state === "verified" ? "verified" : trail.statuses[m.id]?.state === "ready" ? "ready" : ""} />)}</div>
          <span>{trail.verifiedCount} of {total} verified on-chain</span>
        </div>
        <Cluster pulse={pulse} compact />
      </section>

      {!w.address && (
        <div className="banner" role="status">
          <span>Connect a wallet to begin. Mission 1 creates one with a passkey, in under a minute.</span>
          <button type="button" className="btn primary small" onClick={() => void connectWallet()} disabled={w.phase === "connecting" || w.phase === "starting"}>{w.phase === "connecting" ? "Connecting…" : "Connect wallet"}</button>
        </div>
      )}
      {w.phase === "unavailable" && <p className="banner bad" role="alert">{w.error ?? "The wallet could not start."}</p>}
      {anyError && <p className="banner bad" role="alert">Some results could not be read from the network. That does not mean a mission is not done. <button type="button" className="link" onClick={() => void trail.refreshAll()}>Read again</button></p>}

      <section className="panelrow" aria-label="Missions">
        {missions.map((m, i) => (
          <MissionKey key={m.id} mission={m} index={i} status={trail.statuses[m.id] ?? { state: "checking" }} onOpen={() => { window.location.hash = `/trail/${m.id}`; }} />
        ))}
      </section>
      {w.address && <p className="refresh"><button type="button" className="link" onClick={() => void trail.refreshAll()}>Re-read everything from the chain</button></p>}

      {open >= 0 && missions[open] && (
        <MissionPanel mission={missions[open]} index={open} status={trail.statuses[missions[open].id] ?? { state: "checking" }} trail={trail} onClose={() => { window.location.hash = "/trail"; }} />
      )}
    </>
  );
}
