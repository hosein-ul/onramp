import { useEffect, useState } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import { makeReceipt, type Receipt, type ReceiptRef } from "../receipts/receipt";
import { ReceiptCard } from "../receipts/ReceiptCard";
import { evaluate } from "../trail/trail";
import { networkReader } from "../verify/reader";

type View = { kind: "loading" } | { kind: "ok"; receipt: Receipt; note?: string } | { kind: "no"; reason: string } | { kind: "error"; message: string };
const reader = networkReader();

/** A receipt link is only pointers. This page re-reads the chain and shows what the chain says now. */
export function ReceiptPage({ r }: { r: ReceiptRef }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    const m = MISSIONS_V1.missions.find((x) => x.id === r.missionId);
    if (!m) { setView({ kind: "no", reason: "This link points to a mission Waypoint does not know." }); return; }
    setView({ kind: "loading" });
    const thrusd = r.tokenAccount ? { tokenAccount: r.tokenAccount } : undefined;
    evaluate(m, reader, { wallet: r.address, thrusd }).then((o) => {
      if (!live) return;
      if (o.kind === "verified") {
        const note = r.signature && o.evidence.signature !== r.signature ? "The chain now shows a newer transaction for this mission than the one in the link." : undefined;
        setView({ kind: "ok", receipt: makeReceipt(m.id, m.title, o.evidence, r.tokenAccount), note });
      } else if (o.kind === "pending") setView({ kind: "no", reason: o.reason });
      else if (o.kind === "error") setView({ kind: "error", message: o.message });
    });
    return () => { live = false; };
  }, [r.missionId, r.address, r.signature, r.tokenAccount]);

  return (
    <section className="receipt-page">
      <p className="eyebrow">Receipt</p>
      {view.kind === "loading" && <p role="status">Checking the chain…</p>}
      {view.kind === "ok" && <><ReceiptCard r={view.receipt} />{view.note && <p className="banner">{view.note}</p>}</>}
      {view.kind === "no" && <p className="banner bad" role="alert">The chain does not confirm this receipt: {view.reason}</p>}
      {view.kind === "error" && <p className="banner bad" role="alert">{view.message} Open the link again in a moment.</p>}
      <p><a className="link" href="#/trail">Go to the trail</a></p>
    </section>
  );
}
