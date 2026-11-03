import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import { prepareThrusd } from "../wallet/wallet";
import { networkReader } from "../verify/reader";
import { deriveStates, evaluate, type MissionStatus, type Outcome, type TrailContext } from "./trail";

const MISSIONS = MISSIONS_V1.missions;

export interface Trail {
  statuses: Record<string, MissionStatus>;
  verifiedCount: number;
  thrusd?: { tokenAccount: string; mint?: string };
  /** Re-reads the chain for one mission. Safe to repeat: it only reads. */
  verify: (id: string) => Promise<Outcome>;
  /** Re-reads the chain for every mission. */
  refreshAll: () => Promise<void>;
}

const reader = networkReader();

/** Progress is never stored. Every value here is recomputed from chain reads whenever the wallet changes. */
export function useTrail(wallet: string | undefined): Trail {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [thrusd, setThrusd] = useState<Trail["thrusd"]>();
  const generation = useRef(0);
  const ctxRef = useRef<TrailContext | null>(null);

  const put = useCallback((id: string, o: Outcome) => setOutcomes((prev) => ({ ...prev, [id]: o })), []);

  const verify = useCallback(
    async (id: string): Promise<Outcome> => {
      const m = MISSIONS.find((x) => x.id === id);
      const ctx = ctxRef.current;
      if (!m || !ctx) return { kind: "pending", reason: "Connect your wallet first." };
      put(id, { kind: "verifying" });
      const o = await evaluate(m, reader, ctx);
      put(id, o);
      return o;
    },
    [put],
  );

  const refreshAll = useCallback(async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const gen = ++generation.current;
    // The wallet derives the token account without creating it, so this is safe to call on every visit.
    let t = ctx.thrusd;
    if (!t) {
      try {
        const d = await prepareThrusd();
        t = { tokenAccount: d.tokenAccountAddress, mint: d.mintAddress };
        if (gen === generation.current) {
          setThrusd(t);
          ctxRef.current = { ...ctx, thrusd: t };
        }
      } catch {
        for (const id of ["token-account", "token-transfer"]) put(id, { kind: "error", message: "The wallet could not report your token account." });
      }
    }
    const run = { ...ctx, thrusd: t };
    for (const m of MISSIONS) {
      if (gen !== generation.current) return; // wallet changed mid-way
      if (!t && (m.id === "token-account" || m.id === "token-transfer")) continue;
      const o = await evaluate(m, reader, run);
      if (gen === generation.current) put(m.id, o);
    }
  }, [put]);

  useEffect(() => {
    generation.current++;
    setThrusd(undefined);
    if (!wallet) {
      ctxRef.current = null;
      const none: Outcome = { kind: "pending", reason: "Connect your wallet to begin." };
      setOutcomes(Object.fromEntries(MISSIONS.map((m) => [m.id, none])));
      return;
    }
    ctxRef.current = { wallet };
    setOutcomes({});
    void refreshAll();
  }, [wallet, refreshAll]);

  const statuses = useMemo(() => deriveStates(MISSIONS, outcomes), [outcomes]);
  const verifiedCount = Object.values(statuses).filter((s) => s.state === "verified").length;
  return { statuses, verifiedCount, thrusd, verify, refreshAll };
}
