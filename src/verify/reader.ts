import { AccountView, PageRequest } from "@thru/sdk";
import { encodeAddress, encodeSignature } from "@thru/sdk/helpers";
import { chain } from "../chain/client";
import { ChainError, type ChainAccount, type ChainReader, type ChainTx } from "./types";

const PAGE = 100;
const MAX_PAGES = 5;

const addr = (k: { bytes?: Uint8Array } | Uint8Array): string => encodeAddress(k instanceof Uint8Array ? k : (k.bytes ?? new Uint8Array(32)));

function isNotFound(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /not[_ ]found|account not found/i.test(m);
}

async function guard<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof ChainError) throw e;
    throw new ChainError(`Could not read ${what} from the network.`, e);
  }
}

/** Reads from Thru's public gRPC-Web endpoint through @thru/sdk. Read-only: no keys, no writes. */
export function networkReader(): ChainReader {
  return {
    async getAccount(address): Promise<ChainAccount | null> {
      try {
        const a = await chain().accounts.get(address, { view: AccountView.FULL });
        return { address, owner: addr(a.meta?.owner as never), balance: a.meta?.balance ?? 0n, data: new Uint8Array(a.data?.data ?? []) };
      } catch (e) {
        if (isNotFound(e)) return null;
        throw new ChainError("Could not read the account from the network.", e);
      }
    },

    listTransactions(address): Promise<ChainTx[]> {
      return guard("your transactions", async () => {
        const out: ChainTx[] = [];
        let token: string | undefined;
        for (let i = 0; i < MAX_PAGES; i++) {
          const res = await chain().transactions.listForAccount(address, { page: new PageRequest({ pageSize: PAGE, pageToken: token }) });
          for (const t of res.transactions) {
            const r = t.executionResult;
            const sig = t.getSignature();
            if (!r || !sig || t.slot === undefined) continue; // not executed yet
            out.push({
              signature: encodeSignature(sig.toBytes()),
              slot: t.slot,
              program: addr(t.program.toBytes()),
              feePayer: addr(t.feePayer.toBytes()),
              readWrite: t.readWriteAccounts.map((k) => addr(k.toBytes())),
              readOnly: t.readOnlyAccounts.map((k) => addr(k.toBytes())),
              instruction: new Uint8Array(t.instructionData ?? []),
              vmError: Number(r.vmError),
              userErrorCode: BigInt(r.userErrorCode),
              eventsCount: Number(r.eventsCount),
            });
          }
          token = res.page?.nextPageToken;
          if (!token) break;
        }
        return out.sort((a, b) => (a.slot === b.slot ? 0 : a.slot > b.slot ? -1 : 1));
      });
    },

    height: () => guard("the current height", async () => (await chain().blocks.getBlockHeight()).finalized),

    async blockTimeMs(slot) {
      try {
        const b = await chain().blocks.get({ slot });
        return b.blockTimeNs ? Number(b.blockTimeNs / 1_000_000n) : undefined;
      } catch {
        return undefined; // a missing timestamp never blocks a verification
      }
    },
  };
}
