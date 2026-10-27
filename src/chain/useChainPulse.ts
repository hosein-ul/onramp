import { useEffect, useState } from "react";
import { chain } from "./client";

export interface Tick {
  slot: bigint;
  hash: Uint8Array;
  timeMs: number;
  computeUnits: bigint;
}

export interface Pulse {
  status: "connecting" | "live" | "error";
  error?: string;
  height?: bigint;
  latencyMs?: number;
  /** Median gap between recent block timestamps, in milliseconds. */
  slotTimeMs?: number;
  ticks: Tick[];
  /** Recent RPC round-trip times, oldest first. */
  latencies: number[];
}

const MAX_TICKS = 56;
const POLL_MS = 1000;
const MAX_FETCH_PER_POLL = 8;

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Polls finalized height and pulls each new block. Everything shown comes from the RPC. */
export function useChainPulse(): Pulse {
  const [pulse, setPulse] = useState<Pulse>({ status: "connecting", ticks: [], latencies: [] });

  useEffect(() => {
    let cancelled = false;
    let lastSlot: bigint | null = null;
    const bySlot = new Map<string, Tick>();
    const latencies: number[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, POLL_MS * 2);
        return;
      }
      try {
        const started = performance.now();
        const height = await chain().blocks.getBlockHeight();
        const latencyMs = Math.round(performance.now() - started);
        latencies.push(latencyMs);
        if (latencies.length > 48) latencies.shift();
        const head = height.finalized;

        const from = lastSlot === null ? head - 23n : lastSlot + 1n;
        const wanted: bigint[] = [];
        for (let s = from < head - 55n ? head - 55n : from; s <= head && wanted.length < MAX_FETCH_PER_POLL; s++) {
          wanted.push(s);
        }
        const fetched = await Promise.all(
          wanted.map(async (slot): Promise<Tick | null> => {
            try {
              const block = await chain().blocks.get({ slot });
              return {
                slot,
                hash: new Uint8Array(block.header.blockHash ?? new Uint8Array(32)),
                timeMs: Number(block.blockTimeNs ?? 0n) / 1e6,
                computeUnits: BigInt(block.footer?.consumedComputeUnits ?? 0n),
              };
            } catch {
              return null; // skipped or not yet queryable slot
            }
          }),
        );
        for (const t of fetched) if (t) bySlot.set(t.slot.toString(), t);
        const ticks = [...bySlot.values()].sort((a, b) => (a.slot < b.slot ? -1 : 1)).slice(-MAX_TICKS);
        bySlot.clear();
        for (const t of ticks) bySlot.set(t.slot.toString(), t);
        lastSlot = head;

        const gaps: number[] = [];
        for (let i = 1; i < ticks.length; i++) {
          const a = ticks[i - 1];
          const b = ticks[i];
          if (a && b && b.timeMs > a.timeMs) gaps.push(b.timeMs - a.timeMs);
        }
        if (!cancelled) {
          setPulse({ status: "live", height: head, latencyMs, slotTimeMs: median(gaps), ticks, latencies: [...latencies] });
        }
      } catch (e) {
        if (!cancelled) {
          setPulse((p) => ({ ...p, status: "error", error: e instanceof Error ? e.message : "Network unreachable" }));
        }
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return pulse;
}
