import { useSyncExternalStore } from "react";
import type { BrowserSDK, DepositDestination } from "@thru/wallet";
import { chain } from "../chain/client";
import { NETWORK, SITE } from "../config";
import { fromBase64, type TransactionIntent } from "./intents";

export type WalletPhase = "idle" | "starting" | "ready" | "connecting" | "connected" | "unavailable";

export interface WalletState {
  phase: WalletPhase;
  address?: string;
  error?: string;
}

export interface SubmitResult {
  signature: string;
  /** null when the network did not report an execution result before we stopped waiting. */
  executed: boolean | null;
}


let sdk: BrowserSDK | null = null;
let starting: Promise<BrowserSDK> | null = null;
let state: WalletState = { phase: "idle" };
const listeners = new Set<() => void>();

function set(next: WalletState): void {
  state = next;
  for (const l of listeners) l();
}

function explain(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (/reject|cancel|closed|denied/i.test(m)) return "The wallet was closed before it finished. Nothing was changed.";
  if (/origin|frame|iframe/i.test(m)) return "The wallet could not load in this page. Check your connection and any content blockers, then try again.";
  return m ? `${fallback} (${m})` : fallback;
}

function start(): Promise<BrowserSDK> {
  starting ??= (async () => {
    set({ ...state, phase: "starting" });
    try {
      // The wallet SDK is large, so it loads only when the wallet is first needed.
      const { BrowserSDK, ThruNetwork } = await import("@thru/wallet");
      const networks = { alphanet: ThruNetwork.Alphanet, betanet: ThruNetwork.Betanet } as const;
      const instance = new BrowserSDK({
        iframeUrl: NETWORK.walletUrl,
        rpcUrl: NETWORK.rpcUrl,
        network: networks[NETWORK.id],
        theme: "dark",
        developerMode: true, // offers the wallet's own test faucet in Add funds (THRUSD)
        autoRestore: true,
        telemetryEnabled: false,
        metadata: { appId: window.location.origin, appName: SITE.name },
      });
      await instance.initialize();
      const sync = () => {
        const a = instance.accounts.getSelected();
        set(a ? { phase: "connected", address: a.address } : { phase: "ready" });
      };
      instance.on("connect", sync);
      instance.on("accountChanged", sync);
      instance.on("disconnect", () => set({ phase: "ready" }));
      sdk = instance;
      sync();
      return instance;
    } catch (e) {
      starting = null;
      set({ phase: "unavailable", error: explain(e, "The wallet could not start.") });
      throw e;
    }
  })();
  return starting;
}

/** Starts the wallet iframe and restores a remembered connection, if the wallet has one. */
export function initWallet(): void {
  void start().catch(() => undefined);
}

export async function connectWallet(): Promise<void> {
  const w = await start();
  set({ ...state, phase: "connecting", error: undefined });
  try {
    const res = await w.connection.connect({ metadata: { appId: window.location.origin, appName: SITE.name } });
    const a = res.selectedAccount ?? res.accounts[0];
    set(a ? { phase: "connected", address: a.address } : { phase: "ready" });
  } catch (e) {
    set({ phase: "ready", error: explain(e, "The wallet did not connect.") });
  }
}

export async function disconnectWallet(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.connection.disconnect();
  } finally {
    set({ phase: "ready" });
  }
}

/** The THRUSD token account the wallet derives for this user, and its mint. Does not create anything. */
export async function prepareThrusd(): Promise<DepositDestination> {
  const w = await start();
  const { DepositTarget } = await import("@thru/wallet");
  return w.deposits.prepare(DepositTarget.THRUSD);
}

/** Creates the THRUSD token account if it does not exist. Safe to repeat. */
export async function ensureThrusdAccount(): Promise<DepositDestination> {
  const w = await start();
  const { DepositTarget } = await import("@thru/wallet");
  const destination = await w.deposits.prepare(DepositTarget.THRUSD);
  await w.deposits.ensureAccount({ destination });
  return destination;
}

async function awaitExecution(signature: string): Promise<boolean | null> {
  for (let i = 0; i < 45; i++) {
    try {
      const t = await chain().transactions.get(signature);
      const r = t.executionResult;
      if (r) return r.vmError === 0 && BigInt(r.userErrorCode) === 0n;
    } catch {
      /* not visible yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

/** The wallet signs after the user approves with a passkey. Waypoint then submits the signed bytes itself. */
export type SubmitStage = "signing" | "submitting" | "confirming";

export async function signAndSubmit(intent: TransactionIntent, onStage?: (s: SubmitStage) => void): Promise<SubmitResult> {
  const w = await start();
  onStage?.("signing");
  const signedBase64 = await w.thru.signTransaction(intent);
  onStage?.("submitting");
  const sent = await chain().transactions.send(fromBase64(signedBase64));
  const signature = String(sent.toString());
  onStage?.("confirming");
  return { signature, executed: await awaitExecution(signature) };
}

export function walletErrorMessage(e: unknown): string {
  return explain(e, "The wallet could not finish that step.");
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Opens the wallet's funding sheet for THRUSD. In developer mode it offers a test faucet that needs no GitHub login. The user picks the rail; Waypoint only reads the balance afterwards. */
export async function openWalletFunding(): Promise<"completed" | "cancelled" | "pending"> {
  const w = await start();
  const { DepositTarget } = await import("@thru/wallet");
  const destination = await w.deposits.prepare(DepositTarget.THRUSD);
  const res = await w.deposits.open({ destination });
  return res.status;
}
