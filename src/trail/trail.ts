import type { Mission } from "../../missions/types";
import { verifyFunds, verifyNativeTransfer, verifyTokenAccount, verifyTokenTransfer, verifyWallet } from "../verify/verifiers";
import { ChainError, type ChainReader, type Evidence, type VerifyResult } from "../verify/types";
import { TRAIL } from "../config";

export type MissionState = "checking" | "locked" | "ready" | "verifying" | "verified" | "error";

export type Outcome =
  | { kind: "unknown" }
  | { kind: "verifying" }
  | { kind: "verified"; evidence: Evidence }
  | { kind: "pending"; reason: string }
  | { kind: "error"; message: string };

export interface MissionStatus {
  state: MissionState;
  evidence?: Evidence;
  /** Why the mission is not done, from the chain. */
  reason?: string;
  /** Why the chain could not be read. Never shown as "not done". */
  error?: string;
}

export interface TrailContext {
  wallet: string;
  /** The wallet's THRUSD token account and mint, when the wallet has reported them. */
  thrusd?: { tokenAccount: string; mint?: string };
}

export async function runVerifier(m: Mission, reader: ChainReader, ctx: TrailContext): Promise<VerifyResult> {
  switch (m.verifier) {
    case "wallet":
      return verifyWallet(reader, ctx.wallet);
    case "native-balance":
      return verifyFunds(reader, ctx.wallet);
    case "native-transfer":
      return verifyNativeTransfer(reader, ctx.wallet, { target: TRAIL.transferTarget });
    case "token-account":
      if (!ctx.thrusd) return { kind: "pending", reason: "The wallet has not reported your token account yet." };
      return verifyTokenAccount(reader, ctx.wallet, ctx.thrusd);
    case "token-transfer":
      if (!ctx.thrusd) return { kind: "pending", reason: "The wallet has not reported your token account yet." };
      return verifyTokenTransfer(reader, ctx.thrusd.tokenAccount);
  }
}

/** Runs a verifier and turns a thrown network failure into an honest "could not read" outcome. */
export async function evaluate(m: Mission, reader: ChainReader, ctx: TrailContext): Promise<Outcome> {
  try {
    const r = await runVerifier(m, reader, ctx);
    return r.kind === "verified" ? { kind: "verified", evidence: r.evidence } : { kind: "pending", reason: r.reason };
  } catch (e) {
    const message = e instanceof ChainError ? e.message : "Could not read the network.";
    return { kind: "error", message };
  }
}

/** Chain results to display states. Nothing here comes from the user; an unverified mission can only be ready or locked. */
export function deriveStates(missions: Mission[], outcomes: Record<string, Outcome | undefined>): Record<string, MissionStatus> {
  const verified = new Set(missions.filter((m) => outcomes[m.id]?.kind === "verified").map((m) => m.id));
  const out: Record<string, MissionStatus> = {};
  for (const m of missions) {
    const o = outcomes[m.id] ?? { kind: "unknown" };
    if (o.kind === "verified") out[m.id] = { state: "verified", evidence: o.evidence };
    else if (o.kind === "verifying") out[m.id] = { state: "verifying" };
    else if (o.kind === "error") out[m.id] = { state: "error", error: o.message };
    else if (o.kind === "unknown") out[m.id] = { state: "checking" };
    else out[m.id] = { state: m.requires.every((id) => verified.has(id)) ? "ready" : "locked", reason: o.reason };
  }
  return out;
}
