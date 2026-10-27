import { useEffect, useMemo, useState } from "react";
import { encodeAddress } from "@thru/sdk/helpers";
import { chain } from "../chain/client";
import { NETWORK } from "../config";
import { grouped, short } from "../ui/format";
import { formatUsd, realPrice, type OracleState } from "./oracle";

interface TxView {
  signature: string;
  slot: bigint;
  feePayer: string;
  program: string;
  readWrite: string[];
  readOnly: string[];
  instruction: Uint8Array;
  eventsCount: number;
  fee: bigint;
  nonce: bigint;
  startSlot: bigint;
  expiryAfter: number;
  chainId: number;
  compute: { requested: number; used: bigint };
  memory: { requested: number; used: bigint };
  state: { requested: number; used: bigint };
}

const addr = (k: { bytes?: Uint8Array } | Uint8Array): string => encodeAddress(k instanceof Uint8Array ? k : (k.bytes as Uint8Array));
const cache = new Map<string, TxView>();

async function loadTx(signature: string): Promise<TxView> {
  const hit = cache.get(signature);
  if (hit) return hit;
  const t = await chain().transactions.get(signature);
  const r = t.executionResult;
  if (!r) throw new Error("The transaction has no execution result yet.");
  const v: TxView = {
    signature, slot: t.slot ?? 0n, feePayer: addr(t.feePayer.toBytes()), program: addr(t.program.toBytes()),
    readWrite: t.readWriteAccounts.map((k) => addr(k.toBytes())), readOnly: t.readOnlyAccounts.map((k) => addr(k.toBytes())),
    instruction: new Uint8Array(t.instructionData ?? []), eventsCount: Number(r.eventsCount), fee: t.fee, nonce: t.nonce, startSlot: t.startSlot,
    expiryAfter: t.expiryAfter, chainId: t.chainId,
    compute: { requested: t.requestedComputeUnits, used: BigInt(r.consumedComputeUnits) },
    memory: { requested: t.requestedMemoryUnits, used: BigInt(r.consumedMemoryUnits) },
    state: { requested: t.requestedStateUnits, used: BigInt(r.consumedStateUnits) },
  };
  cache.set(signature, v);
  return v;
}

function Meter({ label, used, budget, hint }: { label: string; used: bigint; budget: number; hint: string }) {
  const pct = budget > 0 ? (Number(used) / budget) * 100 : 0;
  return (
    <div className="tx-meter">
      <div className="top"><b>{label}</b><span>{grouped(used)} of {grouped(budget)}</span></div>
      <div className="bar" role="img" aria-label={`${label}: ${grouped(used)} used of ${grouped(budget)} requested`}><i style={{ width: `${Math.max(pct, 1.2)}%` }} /></div>
      <small>{pct < 0.1 ? "under 0.1%" : `${pct.toFixed(1)}%`} of the budget the transaction asked for. {hint}</small>
    </div>
  );
}

export function TxAnatomy({ o, dev }: { o: OracleState; dev: boolean }) {
  const sigs = useMemo(() => {
    const m = new Map<string, bigint>();
    for (const f of o.feeds) for (const p of f.points) m.set(p.signature, p.slot);
    return [...m.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).slice(0, 12).map(([s]) => s);
  }, [o.feeds]);
  const [pick, setPick] = useState(0);
  const [tx, setTx] = useState<TxView | null>(null);
  const [err, setErr] = useState("");
  const sig = sigs[pick];

  useEffect(() => {
    if (!sig) return;
    let live = true;
    setErr("");
    loadTx(sig).then((v) => live && setTx(v), (e) => live && setErr(e instanceof Error ? e.message : "Could not read the transaction."));
    return () => { live = false; };
  }, [sig]);

  if (!sig) return <div className="lab-card"><p className="lab-wait" role="status">Waiting for a recent oracle transaction…</p></div>;
  if (err) return <div className="lab-card"><p className="banner bad" role="alert">{err}</p></div>;
  if (!tx) return <div className="lab-card"><p className="lab-wait" role="status">Reading the transaction…</p></div>;

  const feedByAddr = new Map(o.feeds.map((f) => [f.address, f]));
  const updated = o.feeds.map((f) => ({ f, p: f.points.find((p) => p.signature === tx.signature) })).filter((x) => x.p);

  return (
    <div className="lab-card">
      <div className="tx-pick">
        <span>Recent update</span>
        <div>{sigs.slice(0, 6).map((s, i) => <button key={s} type="button" className={i === pick ? "on" : ""} onClick={() => setPick(i)} aria-pressed={i === pick}>{i === 0 ? "newest" : `${i} earlier`}</button>)}</div>
        <a href={`${NETWORK.explorerUrl}/tx/${tx.signature}`} target="_blank" rel="noreferrer noopener">{short(tx.signature, 8, 6)}</a>
      </div>

      <div className="tx-flow">
        <div className="node a"><small>1 signature from</small><b>{short(tx.feePayer, 6, 5)}</b><span>the reporter pays and signs</span></div>
        <div className="arrow"><span>{tx.instruction.length} bytes<br />of input</span></div>
        <div className="node b"><small>runs program</small><b>Oracle</b><span>{short(tx.program, 6, 5)}</span></div>
        <div className="arrow"><span>{tx.readWrite.length} accounts<br />written</span></div>
        <ul className="node c">
          {tx.readWrite.map((a) => {
            const f = feedByAddr.get(a);
            const u = updated.find((x) => x.f.address === a);
            const ex = f?.meta?.exponent ?? -5;
            return <li key={a} className={f ? "feed" : ""}><b>{f?.symbol ?? "account"}</b><span>{u?.p ? `${formatUsd(realPrice(u.p.oldPrice, ex))} → ${formatUsd(realPrice(u.p.price, ex))}` : short(a, 6, 4)}</span></li>;
          })}
          {tx.readOnly.map((a) => <li key={a} className="ro"><b>read-only</b><span>{short(a, 6, 4)}</span></li>)}
        </ul>
      </div>
      <p className="tx-sum"><b>One signature, {updated.length > 0 ? updated.length : tx.eventsCount} price update{(updated.length || tx.eventsCount) === 1 ? "" : "s"}, {tx.eventsCount} event{tx.eventsCount === 1 ? "" : "s"} emitted.</b> Every account the program may write is named up front in the transaction itself.</p>

      <h4 className="tx-h">The budget the transaction declared</h4>
      <div className="tx-meters">
        <Meter label="Compute" used={tx.compute.used} budget={tx.compute.requested} hint="The VM counts work per instruction. A program that goes over its budget is stopped and its changes are undone." />
        <Meter label="Memory" used={tx.memory.used} budget={tx.memory.requested} hint="Counted in 4 KB units, according to the Thru resource spec." />
        <Meter label="State" used={tx.state.used} budget={tx.state.requested} hint="Counted when a transaction creates account state." />
      </div>

      {dev && (
        <>
          <pre className="lab-code">{JSON.stringify({ slot: tx.slot.toString(), fee: tx.fee.toString(), nonce: tx.nonce.toString(), startSlot: tx.startSlot.toString(), expiryAfter: tx.expiryAfter, chainId: tx.chainId }, null, 2)}</pre>
          <div className="tx-hex" aria-label="Instruction bytes">{Array.from(tx.instruction, (b, i) => <span key={i}>{b.toString(16).padStart(2, "0")}</span>)}</div>
        </>
      )}
    </div>
  );
}
