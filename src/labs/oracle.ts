import { useEffect, useRef, useState } from "react";
import { AccountView, Filter, FilterParamValue, PageRequest } from "@thru/sdk";
import { decodeAddress, encodeSignature } from "@thru/sdk/helpers";
import { parseOracleEvent, parseOracleFeedAccount } from "@thru/programs/oracle";
import { chain } from "../chain/client";
import { PROGRAMS_EXTRA } from "./programs";

export interface PricePoint {
  tNs: bigint;
  oldPrice: bigint;
  price: bigint;
  signature: string;
  slot: bigint;
}

export interface FeedMeta {
  exponent: number;
  maxStalenessNs: bigint;
  maxVarianceBps: number;
  reporter: string;
  admin: string;
}

export interface Feed {
  address: string;
  /** e.g. "BTC-USD:ticker@coinbase" */
  name: string;
  symbol: string;
  meta?: FeedMeta;
  /** Oldest first. */
  points: PricePoint[];
}

export interface OracleState {
  status: "loading" | "live" | "error";
  error?: string;
  feeds: Feed[];
  /** The newest chain timestamp seen. Ages are measured against this, not the viewer's clock. */
  nowNs: bigint;
}

const MAX_POINTS = 120;

export const symbolOf = (feedName: string): string => feedName.split("-")[0] ?? feedName;

/** value = price x 10^exponent */
export function realPrice(price: bigint, exponent: number): number {
  return Number(price) * Math.pow(10, exponent);
}

export function formatUsd(v: number): string {
  const d = v >= 1000 ? 2 : v >= 10 ? 3 : v >= 1 ? 4 : 5;
  return v.toLocaleString("en-US", { minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d });
}

async function fetchEvents(size: number): Promise<{ feedName: string; feedAddress: string; oldPrice: bigint; newPrice: bigint; tNs: bigint; slot: bigint; signature: string }[]> {
  const filter = new Filter({
    expression: "event.program.value == params.address",
    params: { address: FilterParamValue.bytes(new Uint8Array(decodeAddress(PROGRAMS_EXTRA.oracle))) },
  });
  const res = await chain().events.list({ filter, page: new PageRequest({ pageSize: size }) });
  const out = [];
  for (const e of res.events) {
    if (!e.payload) continue;
    try {
      const p = parseOracleEvent(e.payload);
      if (p.kind !== "priceUpdate") continue;
      out.push({ feedName: p.feedName, feedAddress: p.feedAddress, oldPrice: p.oldPrice, newPrice: p.newPrice, tNs: p.timestampNs, slot: BigInt(e.slot ?? 0n), signature: encodeSignature(e.transactionSignature ?? new Uint8Array()) });
    } catch {
      /* not a price event */
    }
  }
  return out;
}

async function fetchMeta(address: string): Promise<FeedMeta | undefined> {
  try {
    const acc = await chain().accounts.get(address, { view: AccountView.FULL });
    const f = parseOracleFeedAccount(acc);
    if (f.kind !== "price") return undefined;
    return { exponent: f.exponent, maxStalenessNs: f.common.maxStalenessNs, maxVarianceBps: f.maxVarianceBps, reporter: f.common.reporterAddress, admin: f.common.adminAddress };
  } catch {
    return undefined;
  }
}

/** Live oracle prices, read from the program's on-chain events and the feed accounts. */
export function useOracle(): OracleState {
  const [state, setState] = useState<OracleState>({ status: "loading", feeds: [], nowNs: 0n });
  const feeds = useRef(new Map<string, Feed>());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const merge = async (rows: Awaited<ReturnType<typeof fetchEvents>>) => {
      const fresh = rows.filter((r) => !seen.current.has(`${r.signature}:${r.feedAddress}`)).sort((a, b) => (a.tNs < b.tNs ? -1 : 1));
      for (const r of fresh) {
        seen.current.add(`${r.signature}:${r.feedAddress}`);
        let f = feeds.current.get(r.feedAddress);
        if (!f) {
          f = { address: r.feedAddress, name: r.feedName, symbol: symbolOf(r.feedName), points: [] };
          feeds.current.set(r.feedAddress, f);
          void fetchMeta(r.feedAddress).then((m) => { if (m) f!.meta = m; });
        }
        f.points.push({ tNs: r.tNs, oldPrice: r.oldPrice, price: r.newPrice, signature: r.signature, slot: r.slot });
        if (f.points.length > MAX_POINTS) f.points.shift();
      }
    };

    const publish = () => {
      const list = [...feeds.current.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
      const nowNs = list.reduce((m, f) => { const t = f.points[f.points.length - 1]?.tNs ?? 0n; return t > m ? t : m; }, 0n);
      setState({ status: "live", feeds: list.map((f) => ({ ...f, points: [...f.points] })), nowNs });
    };

    (async () => {
      try {
        await merge(await fetchEvents(300));
        if (cancelled) return;
        // Give the account reads a moment so the first paint already has exponents.
        await new Promise((r) => setTimeout(r, 500));
        publish();
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "Network unreachable" }));
      }
      const tick = async () => {
        if (cancelled) return;
        if (!document.hidden) {
          try { await merge(await fetchEvents(80)); if (!cancelled) publish(); }
          catch (e) { if (!cancelled) setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : "Network unreachable" })); }
        }
        timer = setTimeout(tick, 3000);
      };
      timer = setTimeout(tick, 3000);
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  return state;
}
