import { useState } from "react";
import { formatTime, grouped, short } from "../ui/format";
import { downloadReceiptPng } from "./image";
import { explorerUrl, receiptLink, type Receipt } from "./receipt";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ReceiptCard({ r, actions = true }: { r: Receipt; actions?: boolean }) {
  const [note, setNote] = useState("");
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2500); };
  return (
    <section className="receipt" aria-label={`Receipt for ${r.title}`}>
      <div className="receipt-band"><span>VERIFIED ON-CHAIN</span><span>{r.network}</span></div>
      <h4>{r.title}</h4>
      <dl>
        <dt>Address</dt><dd title={r.address}>{short(r.address, 8, 6)}</dd>
        <dt>{r.signature ? "Signature" : "Proof"}</dt><dd title={r.signature}>{r.signature ? short(r.signature, 10, 8) : "state read from the chain"}</dd>
        <dt>{r.signature ? "Slot" : "Read at slot"}</dt><dd>{grouped(r.slot)}</dd>
        <dt>Time</dt><dd>{formatTime(r.timeMs)}</dd>
      </dl>
      <p className="receipt-sum">{r.summary}</p>
      {actions && (
        <div className="receipt-actions">
          <a className="btn ghost" href={explorerUrl(r)} target="_blank" rel="noreferrer noopener">Open in explorer</a>
          <button type="button" className="btn ghost" onClick={async () => say((await copy(receiptLink(r))) ? "Link copied." : "Copy failed. Select the address bar instead.")}>Copy link</button>
          <button type="button" className="btn ghost" onClick={async () => { try { await downloadReceiptPng(r); say("Image saved."); } catch (e) { say(e instanceof Error ? e.message : "Could not create the image."); } }}>Download image</button>
        </div>
      )}
      <p className="receipt-note" role="status">{note}</p>
    </section>
  );
}
