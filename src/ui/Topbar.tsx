import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { connectWallet, disconnectWallet, initWallet, useWallet } from "../wallet/wallet";
import { short } from "./format";

export function Topbar({ pulse, section }: { pulse: Pulse; section: string }) {
  const w = useWallet();
  const net = pulse.status === "live" ? "live" : pulse.status === "error" ? "offline" : "connecting";
  return (
    <header className="topbar">
      <a className="logo" href="#/" aria-label="Waypoint home"><span className="mk" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>Waypoint</a>
      <nav className="topnav" aria-label="Main">
        <a href="#/trail" className={section === "trail" ? "on" : ""}>Trail</a>
        <a href="#/lab" className={section === "lab" ? "on" : ""}>Lab</a>
      </nav>
      <span className="chip" title={`Chain ID ${NETWORK.chainId}`}><i className={`dot ${pulse.status}`} />{NETWORK.name}<em>{net}</em></span>
      {w.phase === "connected" && w.address ? (
        <span className="chip wallet"><span className="mono" title={w.address}>{short(w.address, 6, 5)}</span><button type="button" className="link" onClick={() => void disconnectWallet()}>Disconnect</button></span>
      ) : w.phase === "unavailable" ? (
        <button type="button" className="btn small" onClick={() => initWallet()} title={w.error}>Wallet unavailable. Retry</button>
      ) : (
        <button type="button" className="btn small primary" onClick={() => void connectWallet()} disabled={w.phase === "connecting" || w.phase === "starting"}>{w.phase === "connecting" ? "Connecting…" : w.phase === "starting" ? "Starting wallet…" : "Connect wallet"}</button>
      )}
    </header>
  );
}
