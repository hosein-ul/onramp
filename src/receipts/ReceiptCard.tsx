import { useState } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import { Stamp } from "../ui/stamp";
import { formatTime, grouped, short } from "../ui/format";
import { downloadReceiptPng } from "./image";
import { explorerUrl, receiptLink, stampSeed, type Receipt } from "./receipt";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The receipt: a stamp drawn from the on-chain signature, and the pointers that let anyone re-check it. */
export function ReceiptCard({ r, actions = true }: { r: Receipt; actions?: boolean }) {
  const [note, setNote] = useState("");
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2500); };
  const n = MISSIONS_V1.missions.findIndex((m) => m.id === r.missionId) + 1;
  return (
    <section className="receipt" aria-label={`Receipt for ${r.title}`}>
      <div className="rst"><Stamp seed={stampSeed(r)} label={`${String(n).padStart(2, "0")} · VERIFIED`} width={150} /></div>
      <div className="receipt-band"><span>Verified on chain</span><span>{r.network}</span></div>
      <h4>{r.title}</h4>
      <dl>
        <div><dt>Address</dt><dd title={r.address}>{short(r.address, 8, 6)}</dd></div>
        <div><dt>{r.signature ? "Signature" : "Proof"}</dt><dd title={r.signature}>{r.signature ? short(r.signature, 10, 8) : "state read from the chain"}</dd></div>
        <div><dt>{r.signature ? "Slot" : "Read at slot"}</dt><dd>{grouped(r.slot)}</dd></div>
        <div><dt>Time</dt><dd>{formatTime(r.timeMs)}</dd></div>
      </dl>
      <p className="receipt-sum">{r.summary}</p>
      {actions && (
        <div className="receipt-actions">
          <a className="btn ghost small" href={explorerUrl(r)} target="_blank" rel="noreferrer noopener">Open in explorer</a>
          <button type="button" className="btn ghost small" onClick={async () => say((await copy(receiptLink(r))) ? "Link copied." : "Copy failed. Select the address bar instead.")}>Copy link</button>
          <button type="button" className="btn ghost small" onClick={async () => { try { await downloadReceiptPng(r); say("Image saved."); } catch (e) { say(e instanceof Error ? e.message : "Could not create the image."); } }}>Download image</button>
        </div>
      )}
      <p className="receipt-note" role="status">{note}</p>
    </section>
  );
}
