import { useEffect, useMemo, useState } from "react";
import { NETWORK } from "../config";
import { short } from "../ui/format";
import { formatUsd, realPrice, type Feed, type OracleState } from "./oracle";

function useChainNow(state: OracleState): bigint {
  const [, tick] = useState(0);
  const base = useMemo(() => ({ ns: state.nowNs, at: Date.now() }), [state.nowNs]);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(t); }, []);
  return base.ns + BigInt(Math.max(0, Date.now() - base.at)) * 1_000_000n;
}

function Spark({ feed }: { feed: Feed }) {
  const pts = feed.points.slice(-48);
  if (pts.length < 2) return <svg className="or-spark" viewBox="0 0 100 28" aria-hidden="true" />;
  const vals = pts.map((p) => Number(p.price));
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const d = vals.map((v, i) => `${i ? "L" : "M"}${((i / (vals.length - 1)) * 100).toFixed(1)},${(26 - ((v - lo) / span) * 24).toFixed(1)}`).join(" ");
  return <svg className="or-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d={d} fill="none" vectorEffect="non-scaling-stroke" /></svg>;
}

/** How old the last update is, against the maximum age the feed itself declares. */
function AgeRing({ ageS, maxS }: { ageS: number; maxS: number | undefined }) {
  const frac = maxS ? Math.min(ageS / maxS, 1) : 0;
  const r = 15, c = 2 * Math.PI * r;
  const late = maxS !== undefined && frac > 0.7;
  return (
    <svg className={`or-ring${late ? " late" : ""}`} viewBox="0 0 40 40" role="img" aria-label={maxS ? `Last update ${ageS.toFixed(1)} seconds ago, limit ${maxS} seconds` : `Last update ${ageS.toFixed(1)} seconds ago`}>
      <circle cx="20" cy="20" r={r} className="bg" />
      {maxS && <circle cx="20" cy="20" r={r} className="fg" strokeDasharray={`${c * (1 - frac)} ${c}`} transform="rotate(-90 20 20)" />}
      <text x="20" y="24" textAnchor="middle">{ageS < 10 ? ageS.toFixed(0) : Math.min(99, Math.round(ageS))}</text>
    </svg>
  );
}

export function OracleBoard({ o, dev }: { o: OracleState; dev: boolean }) {
  const now = useChainNow(o);
  const [sel, setSel] = useState<string | null>(null);
  const selected = o.feeds.find((f) => f.address === sel) ?? null;

  return (
    <div className="lab-card">
      {o.status === "error" && <p className="banner bad" role="alert">The network did not answer: {o.error}. Nothing here is simulated, so the board waits.</p>}
      {o.status === "loading" && <p className="lab-wait" role="status">Reading price events from the chain…</p>}
      <ul className="or-grid">
        {o.feeds.map((f) => {
          const last = f.points[f.points.length - 1];
          const first = f.points[0];
          if (!last) return null;
          const ex = f.meta?.exponent ?? -5;
          const price = realPrice(last.price, ex);
          const change = first && first.price !== 0n ? ((Number(last.price) - Number(first.price)) / Number(first.price)) * 100 : 0;
          const ageS = Number(now > last.tNs ? now - last.tNs : 0n) / 1e9;
          const maxS = f.meta ? Number(f.meta.maxStalenessNs) / 1e9 : undefined;
          return (
            <li key={f.address}>
              <button type="button" className={`or-tile${sel === f.address ? " on" : ""}`} onClick={() => setSel(sel === f.address ? null : f.address)} aria-pressed={sel === f.address} aria-label={`${f.symbol} price ${formatUsd(price)} dollars, ${ageS.toFixed(0)} seconds old`}>
                <span className="sym">{f.symbol}</span>
                <AgeRing ageS={ageS} maxS={maxS} />
                <span className="px">${formatUsd(price)}</span>
                <Spark feed={f} />
                <span className="meta">{change === 0 ? "no change" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(3)}%`} · {f.points.length} updates</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="lab-note">The ring drains toward the maximum age each feed declares for itself. Ages are measured against chain time, not your clock.</p>

      {selected && (
        <section className="or-inspect" aria-label={`${selected.symbol} feed details`}>
          <h4>{selected.name}</h4>
          <dl>
            <dt>Feed account</dt><dd><a href={`${NETWORK.explorerUrl}/address/${selected.address}`} target="_blank" rel="noreferrer noopener">{short(selected.address, 10, 8)}</a></dd>
            <dt>Reporter</dt><dd>{selected.meta ? short(selected.meta.reporter, 10, 8) : "reading…"}</dd>
            <dt>Declared limits</dt><dd>{selected.meta ? `max age ${Number(selected.meta.maxStalenessNs) / 1e9} s · max variance ${selected.meta.maxVarianceBps} bps` : "reading…"}</dd>
            <dt>Stored as</dt><dd>{selected.meta ? `integer × 10^${selected.meta.exponent}` : "reading…"}</dd>
          </dl>
          <table className="or-table">
            <thead><tr><th>Slot</th><th>Old</th><th>New</th><th>Transaction</th></tr></thead>
            <tbody>
              {[...selected.points].reverse().slice(0, 8).map((p) => {
                const ex = selected.meta?.exponent ?? -5;
                return <tr key={p.signature}><td>{p.slot.toString()}</td><td>{formatUsd(realPrice(p.oldPrice, ex))}</td><td>{formatUsd(realPrice(p.price, ex))}</td><td><a href={`${NETWORK.explorerUrl}/tx/${p.signature}`} target="_blank" rel="noreferrer noopener">{short(p.signature, 6, 4)}</a></td></tr>;
              })}
            </tbody>
          </table>
          {dev && <pre className="lab-code">{JSON.stringify({ address: selected.address, name: selected.name, raw: selected.points.slice(-1).map((p) => ({ price: p.price.toString(), tNs: p.tNs.toString() })), meta: selected.meta ? { exponent: selected.meta.exponent, maxStalenessNs: selected.meta.maxStalenessNs.toString(), maxVarianceBps: selected.meta.maxVarianceBps } : null }, null, 2)}</pre>}
        </section>
      )}
    </div>
  );
}
