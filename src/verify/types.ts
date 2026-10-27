/** Plain chain data the verifiers work on. A ChainReader fills these from the network; tests fill them from recorded fixtures. */
export interface ChainAccount {
  address: string;
  owner: string;
  balance: bigint;
  data: Uint8Array;
}

export interface ChainTx {
  signature: string;
  slot: bigint;
  program: string;
  feePayer: string;
  readWrite: string[];
  readOnly: string[];
  instruction: Uint8Array;
  vmError: number;
  userErrorCode: bigint;
  eventsCount: number;
}

export interface ChainReader {
  /** Resolves null when the account does not exist. Throws ChainError when the network cannot be read. */
  getAccount(address: string): Promise<ChainAccount | null>;
  /** Executed transactions that involve the account, newest first. */
  listTransactions(address: string): Promise<ChainTx[]>;
  /** Finalized height, used as the "read at" slot. */
  height(): Promise<bigint>;
  /** Block timestamp in milliseconds since the epoch, when the block can be read. */
  blockTimeMs(slot: bigint): Promise<number | undefined>;
}

/** The network could not be read. Never means "mission not done". */
export class ChainError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ChainError";
  }
}

export interface Evidence {
  /** What the chain showed, in one plain sentence. */
  summary: string;
  address: string;
  /** Transaction that proves the mission, when one exists. */
  signature?: string;
  /** Slot of that transaction, or the slot the state was read at. */
  slot: bigint;
  /** Block time in ms, when known. */
  timeMs?: number;
  /** True when the slot is the read height and not a specific transaction. */
  readAtSlot?: boolean;
}

export type VerifyResult =
  | { kind: "verified"; evidence: Evidence }
  /** The chain was read fine and the mission is not done yet. */
  | { kind: "pending"; reason: string };

export const isOk = (tx: ChainTx): boolean => tx.vmError === 0 && tx.userErrorCode === 0n;
