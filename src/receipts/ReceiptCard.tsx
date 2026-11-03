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

/** The receipt as a drawing title block: provenance printed on the artefact itself. */
export function ReceiptCard({ r, actions = true }: { r: Receipt; actions?: boolean }) {
  const [note, setNote] = useState("");
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2500); };
  return (
    <section className="receipt" aria-label={`Receipt for ${r.title}`}>
      <div className="receipt-band"><span>■ VERIFIED ON-CHAIN</span><span>{r.network.toUpperCase()}</span></div>
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
