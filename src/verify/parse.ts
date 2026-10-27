import type { ChainTx } from "./types";

/** The trailing action of a passkey-wallet transaction: opcode 2 (transfer), two account indices, a u64 amount.
 *  Native transfers and token transfers share this layout; what differs is which accounts the indices point at. */
export interface TransferTail {
  fromIdx: number;
  toIdx: number;
  amount: bigint;
}

const TAIL = 13;

export function parseTransferTail(instruction: Uint8Array): TransferTail | null {
  if (instruction.length < TAIL) return null;
  const v = new DataView(instruction.buffer, instruction.byteOffset + instruction.length - TAIL, TAIL);
  if (v.getUint8(0) !== 2) return null;
  return { fromIdx: v.getUint16(1, true), toIdx: v.getUint16(3, true), amount: v.getBigUint64(5, true) };
}

/** Transaction account order: fee payer, program, writable accounts, read-only accounts. */
export function accountAt(tx: ChainTx, idx: number): string | undefined {
  return [tx.feePayer, tx.program, ...tx.readWrite, ...tx.readOnly][idx];
}
