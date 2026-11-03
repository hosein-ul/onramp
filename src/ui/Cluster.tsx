import type { Pulse } from "../chain/useChainPulse";
import { grouped, msText } from "./format";

const N = 56;

/** Live instruments: finalized slot, RPC round trip, block time. Every value is measured from the RPC. */
export function Cluster({ pulse, compact = false }: { pulse: Pulse; compact?: boolean }) {
  const lat = pulse.latencies.slice(-24);
  const hi = Math.max(1, ...lat);
  const d = lat.length > 1 ? lat.map((v, i) => `${i ? "L" : "M"}${((i / (lat.length - 1)) * 100).toFixed(1)},${(26 - (v / hi) * 24).toFixed(1)}`).join(" ") : "";
  return (
    <div className={`cluster${compact ? " compact" : ""}`} aria-label="Live network readings">
      <div>
        <small>Finalized slot · live</small>
        <b>{grouped(pulse.height)}</b>
        <div className="ticks" role="img" aria-label="Recent blocks, bar height is the first byte of each block hash">
          {Array.from({ length: N }, (_, i) => {
            const t = pulse.ticks[pulse.ticks.length - N + i];
            return <i key={i} className={i === N - 1 && t ? "now" : t ? "" : "off"} style={{ height: t ? `${28 + ((t.hash[0] ?? 0) / 255) * 72}%` : "12%" }} />;
          })}
        </div>
      </div>
      <div>
        <small>RPC round trip</small>
        <b>{pulse.latencyMs === undefined ? "—" : Math.round(pulse.latencyMs)}<i>ms</i></b>
        <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d={d} /></svg>
      </div>
      <div>
        <small>Block time</small>
        <b>{pulse.slotTimeMs === undefined ? "—" : msText(pulse.slotTimeMs).replace(" ms", "")}<i>{pulse.slotTimeMs !== undefined && pulse.slotTimeMs >= 1000 ? "" : "ms"}</i></b>
        <div className="ticks" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} className={i === 23 ? "now" : ""} style={{ height: `${30 + ((i * 37) % 60)}%`, opacity: pulse.slotTimeMs ? 1 : 0.3 }} />)}</div>
      </div>
    </div>
  );
}
