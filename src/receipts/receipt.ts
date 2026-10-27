import { NETWORK } from "../config";
import type { Evidence } from "../verify/types";

export interface Receipt {
  missionId: string;
  title: string;
  network: string;
  address: string;
  signature?: string;
  slot: bigint;
  timeMs?: number;
  summary: string;
  /** The token account for the two token missions, needed to re-verify from a link. */
  tokenAccount?: string;
}

export function makeReceipt(missionId: string, title: string, e: Evidence, tokenAccount?: string): Receipt {
  return { missionId, title, network: NETWORK.name, address: e.address, signature: e.signature, slot: e.slot, timeMs: e.timeMs, summary: e.summary, tokenAccount };
}

export function explorerUrl(r: Pick<Receipt, "signature" | "address">): string {
  return r.signature ? `${NETWORK.explorerUrl}/tx/${r.signature}` : `${NETWORK.explorerUrl}/address/${r.address}`;
}

/** A receipt link carries only pointers. The page that opens it re-reads the chain and shows what the chain says. */
export function receiptLink(r: Receipt, base = window.location.href.split("#")[0] ?? ""): string {
  const q = new URLSearchParams({ a: r.address });
  if (r.signature) q.set("s", r.signature);
  if (r.tokenAccount) q.set("t", r.tokenAccount);
  return `${base}#/receipt/${r.missionId}?${q.toString()}`;
}

export interface ReceiptRef {
  missionId: string;
  address: string;
  signature?: string;
  tokenAccount?: string;
}

export function parseReceiptRoute(route: string): ReceiptRef | null {
  const m = /^receipt\/([a-z-]+)\?(.*)$/.exec(route);
  if (!m) return null;
  const q = new URLSearchParams(m[2]);
  const address = q.get("a");
  if (!address || !m[1]) return null;
  return { missionId: m[1], address, signature: q.get("s") ?? undefined, tokenAccount: q.get("t") ?? undefined };
}
