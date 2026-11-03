import fixtures from "./fixtures/alphanet.json";
import type { ChainAccount, ChainReader, ChainTx } from "../src/verify/types";

type FxAccount = (typeof fixtures)["walletAccount"];
type FxTx = (typeof fixtures)["nativeTransferOk"];

const unhex = (h: string) => new Uint8Array(h.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);

export const account = (f: FxAccount): ChainAccount => ({ address: f.address, owner: f.owner, balance: BigInt(f.balance), data: unhex(f.dataHex) });
export const tx = (f: FxTx): ChainTx => ({
  signature: f.signature, slot: BigInt(f.slot), program: f.program, feePayer: f.feePayer, readWrite: f.readWrite, readOnly: f.readOnly,
  instruction: unhex(f.instructionHex), vmError: f.vmError, userErrorCode: BigInt(f.userErrorCode), eventsCount: f.eventsCount,
});

export const FX = fixtures;

/** An in-memory ChainReader. Anything not given is "not found" or empty, exactly like the network. */
export function fakeReader(opts: { accounts?: ChainAccount[]; txs?: ChainTx[] } = {}): ChainReader {
  const accounts = new Map((opts.accounts ?? []).map((a) => [a.address, a]));
  return {
    getAccount: async (a) => accounts.get(a) ?? null,
    listTransactions: async () => opts.txs ?? [],
    height: async () => 3_200_000n,
    blockTimeMs: async () => 1_790_000_000_000,
  };
}
