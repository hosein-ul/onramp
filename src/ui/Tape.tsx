import type { Tick } from "../chain/useChainPulse";

const SLOTS = 56;

/** The most recent blocks, newest on the right. Bar height is taken from the block hash. */
export function Tape({ ticks }: { ticks: Tick[] }) {
  const cells: (Tick | null)[] = Array.from({ length: SLOTS }, (_, i) => ticks[ticks.length - SLOTS + i] ?? null);
  return (
    <div className="tape" role="img" aria-label={`The ${ticks.length} most recent blocks`}>
      <div className="tape-bars">
        {cells.map((t, i) => {
          const isNew = i === SLOTS - 1 && t !== null;
          const h = t ? 22 + ((t.hash[0] ?? 0) / 255) * 78 : 6;
          return (
            <span
              key={t ? t.slot.toString() : `empty-${i}`}
              className={`bar${t ? "" : " empty"}${isNew ? " now" : ""}`}
              style={{ height: `${h}%` }}
              title={t ? `slot ${t.slot.toLocaleString("en-US")}` : undefined}
            />
          );
        })}
      </div>
      <div className="tape-axis" aria-hidden="true">
        <span>{ticks[0] ? ticks[0].slot.toLocaleString("en-US") : "—"}</span>
        <span>bar height = first byte of the block hash</span>
        <span>now</span>
      </div>
    </div>
  );
}
