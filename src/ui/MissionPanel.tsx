import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Mission } from "../../missions/types";
import { NETWORK, TRAIL } from "../config";
import { makeReceipt } from "../receipts/receipt";
import { ReceiptCard } from "../receipts/ReceiptCard";
import type { MissionStatus } from "../trail/trail";
import type { Trail } from "../trail/useTrail";
import { networkReader } from "../verify/reader";
import { isValidAddress, readTokenBalance } from "../verify/verifiers";
import { PROGRAMS } from "../verify/programs";
import { nativeTransferIntent, tokenTransferIntent } from "../wallet/intents";
import { connectWallet, ensureThrusdAccount, openWalletFunding, signAndSubmit, useWallet, walletErrorMessage, type SubmitStage } from "../wallet/wallet";
import { formatUnits, short } from "./format";

const reader = networkReader();
const STAGE: Record<SubmitStage, string> = {
  signing: "Confirm in the wallet window…",
  submitting: "Signed. Sending to the network…",
  confirming: "Sent. Waiting for the network to execute it…",
};

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function CodeBlock({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="code">
      <pre>{code}</pre>
      <button type="button" className="btn tiny" onClick={async () => { if (await copyText(code)) { setDone(true); setTimeout(() => setDone(false), 1800); } }}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

interface Props { mission: Mission; index: number; status: MissionStatus; trail: Trail; onClose: () => void }

export function MissionPanel({ mission, index, status, trail, onClose }: Props) {
  const wallet = useWallet();
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState<{ tone: "info" | "bad" | "ok"; text: string } | null>(null);
  const [sink, setSink] = useState<string>(TRAIL.tokenSink ?? "");
  const [tokenBalance, setTokenBalance] = useState<bigint | null | undefined>(undefined);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // The panel grows out of the row that was clicked, and is a centred sheet on every screen size.
  useLayoutEffect(() => {
    const el = panelRef.current;
    const row = document.querySelector<HTMLElement>(`[data-mission="${mission.id}"]`);
    if (!el || !row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = row.getBoundingClientRect(), to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${Math.min(1, from.width / to.width)}, ${Math.min(1, from.height / to.height)})`, opacity: 0.2 }, { transform: "none", opacity: 1 }],
      { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [mission.id]);
  const address = wallet.address;
  const locked = status.state === "locked";
  const verified = status.state === "verified" && status.evidence;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => { setMessage(null); setBusy(""); }, [mission.id]);

  const tokenAccount = trail.thrusd?.tokenAccount;
  useEffect(() => {
    if (mission.id !== "token-transfer" || !tokenAccount) return;
    let live = true;
    readTokenBalance(reader, tokenAccount).then((b) => live && setTokenBalance(b), () => live && setTokenBalance(undefined));
    return () => { live = false; };
  }, [mission.id, tokenAccount, busy, status.state]);

  const verify = async () => {
    setBusy("Reading the chain…"); setMessage(null);
    const o = await trail.verify(mission.id);
    setBusy("");
    if (o.kind === "pending") setMessage({ tone: "info", text: o.reason });
    else if (o.kind === "error") setMessage({ tone: "bad", text: `${o.message} This does not mean the mission is not done. Try again.` });
    else if (o.kind === "verified") setMessage({ tone: "ok", text: "Verified from on-chain data." });
  };

  const guard = async (fn: () => Promise<void>) => {
    setMessage(null);
    try { await fn(); } catch (e) { setMessage({ tone: "bad", text: walletErrorMessage(e) }); }
    finally { setBusy(""); }
  };

  const afterSubmit = async (executed: boolean | null, okText: string) => {
    if (executed === false) { setMessage({ tone: "bad", text: "The network rejected the transaction, so nothing changed. Check that your wallet holds enough, then try again." }); return; }
    if (executed === null) { setMessage({ tone: "info", text: "The network has not reported the result yet. Press Verify in a few seconds." }); return; }
    setBusy("Reading the chain…");
    const o = await trail.verify(mission.id);
    setMessage(o.kind === "verified" ? { tone: "ok", text: okText } : { tone: "info", text: o.kind === "pending" ? o.reason : "Could not read the network. Press Verify to try again." });
  };

  const act = () => guard(async () => {
    switch (mission.action.kind) {
      case "wallet-connect": {
        setBusy("Waiting for the wallet…");
        await connectWallet();
        return;
      }
      case "external": {
        if (address && (await copyText(address))) setMessage({ tone: "ok", text: "Address copied." });
        else setMessage({ tone: "info", text: "Select the address above and copy it." });
        return;
      }
      case "wallet-transfer": {
        if (!address) throw new Error("Connect your wallet first.");
        const to = TRAIL.transferTarget;
        if (!to) throw new Error("No transfer target is configured for this network.");
        const r = await signAndSubmit(nativeTransferIntent(address, to, TRAIL.transferAmount), (s) => setBusy(STAGE[s]));
        await afterSubmit(r.executed, "Transfer verified from on-chain data.");
        return;
      }
      case "wallet-token-account": {
        setBusy("Opening your token account…");
        await ensureThrusdAccount();
        await afterSubmit(true, "Token account verified from on-chain data.");
        return;
      }
      case "wallet-token-transfer": {
        if (!address || !trail.thrusd) throw new Error("Connect your wallet first.");
        if (!isValidAddress(sink)) throw new Error("Enter a valid token account address to send to.");
        if (sink === trail.thrusd.tokenAccount) throw new Error("Choose a different token account than your own.");
        setBusy("Checking the destination…");
        const dest = await reader.getAccount(sink);
        if (!dest || dest.owner !== PROGRAMS.token) throw new Error("That address is not a token account on this network.");
        const r = await signAndSubmit(tokenTransferIntent(address, trail.thrusd.tokenAccount, sink, TRAIL.tokenAmount, `Send ${formatUnits(TRAIL.tokenAmount, 6)} THRUSD`), (s) => setBusy(STAGE[s]));
        await afterSubmit(r.executed, "Token transfer verified from on-chain data.");
        return;
      }
    }
  });

  const needsWallet = mission.action.kind !== "wallet-connect" && !address;
  const faucet = tokenAccount ? `${NETWORK.faucetUrl}?network=${NETWORK.id}&tokenAddress=${encodeURIComponent(tokenAccount)}&amount=100` : NETWORK.faucetUrl;
  const sub = (t: string) => t.replace("{address}", address ?? "<your address>");

  return (
    <div className="panel-wrap" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="mp-title">
        <header>
          <span className="mp-n">{String(index + 1).padStart(2, "0")}</span>
          <span className={`pill ${status.state}`}>{status.state === "verified" ? "Verified" : status.state === "ready" ? "Your turn" : status.state === "locked" ? "Locked" : status.state === "error" ? "Can't read network" : "Checking"}</span>
          <button ref={closeRef} type="button" className="btn ghost tiny close" onClick={onClose} aria-label="Close mission">Close</button>
        </header>
        <h2 id="mp-title">{mission.title}</h2>
        <p className="mp-goal">{mission.goal}</p>
        {mission.gloss && <p className="mp-gloss">{mission.gloss}</p>}

        {locked && <p className="mp-lock" role="status">Finish {mission.requires.join(" and ")} first. This mission unlocks when the chain shows it done.</p>}

        <ol className="mp-steps">
          {mission.steps.map((s, i) => (
            <li key={i}><span>{s.text}</span>{s.code && <CodeBlock code={sub(s.code)} />}</li>
          ))}
        </ol>

        {mission.id === "funds" && address && (
          <div className="mp-addr"><small>Your wallet address</small><code>{address}</code><button type="button" className="btn tiny" onClick={async () => setMessage({ tone: (await copyText(address)) ? "ok" : "info", text: (await copyText(address)) ? "Address copied." : "Select the address and copy it." })}>Copy</button></div>
        )}

        {mission.id === "transfer" && (
          <p className="mp-note">Sends <b>{TRAIL.transferAmount.toString()}</b> to <code>{TRAIL.transferTarget ? short(TRAIL.transferTarget, 8, 6) : "(no target set)"}</code>, the network's faucet account, so you give a little back.</p>
        )}

        {mission.id === "token-transfer" && (
          <div className="mp-token">
            <p className="mp-note">Your THRUSD balance: <b>{tokenBalance === undefined ? "reading…" : tokenBalance === null ? "no account yet" : `${formatUnits(tokenBalance, 6)} THRUSD`}</b></p>
            <button type="button" className="btn" disabled={!!busy || !address} onClick={() => void guard(async () => {
              setBusy("Waiting for the wallet…");
              const r = await openWalletFunding();
              setMessage({ tone: r === "cancelled" ? "info" : "ok", text: r === "cancelled" ? "Funding was closed. Nothing changed." : "Funding sent. Your balance below updates when the chain shows it." });
            })}>Get THRUSD in your wallet</button>
            <a className="btn ghost" href={faucet} target="_blank" rel="noreferrer noopener">Or use the web faucet</a>
            <p className="mp-note small">The faucet needs a GitHub or X sign-in and allows 5 requests per minute. Opening it does not add funds; the balance above changes only when the chain says so.</p>
            <label className="field">Send {formatUnits(TRAIL.tokenAmount, 6)} THRUSD to this token account
              <input id="sink" value={sink} onChange={(e) => setSink(e.target.value.trim())} spellCheck={false} autoComplete="off" placeholder="ta…" />
            </label>
          </div>
        )}

        <div className="mp-actions">
          {!verified && (
            <>
              <button type="button" className="btn primary" onClick={act} disabled={!!busy || locked || needsWallet || wallet.phase === "connecting"}>{mission.action.label}</button>
              <button type="button" className="btn" onClick={verify} disabled={!!busy || locked || !address}>Verify</button>
            </>
          )}
          {verified && <button type="button" className="btn" onClick={verify} disabled={!!busy}>Verify again</button>}
        </div>
        {needsWallet && !locked && <p className="mp-msg info" role="status">Create your wallet in mission 1 first.</p>}
        <p className={`mp-msg ${message?.tone ?? ""}`} role="status" aria-live="polite">{busy || message?.text || ""}</p>
        {wallet.error && !busy && <p className="mp-msg bad" role="alert">{wallet.error}</p>}

        {verified && status.evidence && <ReceiptCard r={makeReceipt(mission.id, mission.title, status.evidence, mission.id === "token-account" || mission.id === "token-transfer" ? trail.thrusd?.tokenAccount : undefined)} />}
        <p className="mp-reads"><small>What Waypoint reads</small>{mission.reads}</p>
      </aside>
    </div>
  );
}
