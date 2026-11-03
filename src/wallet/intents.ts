import { decodeAddress } from "@thru/sdk/helpers";
import { PROGRAMS } from "../verify/programs";

/** The shape @thru/wallet's signTransaction expects. */
export interface TransactionIntent {
  walletAddress: string;
  programAddress: string;
  /** base64 */
  instructionData: string;
  readWriteAddresses: string[];
  readOnlyAddresses: string[];
  review: { appName: string; programAddress: string; instruction: string };
}

const hexOf = (address: string): string => Array.from(decodeAddress(address), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * The wallet sorts writable accounts by their raw bytes, then places them after the fee payer (0) and the
 * program (1). Instruction indices must follow that order, not the order the app listed them in.
 * Putting them in the wrong order makes the transaction land on chain and fail.
 */
export function orderWritable(addresses: string[]): { sorted: string[]; indexOf: (address: string) => number } {
  const sorted = [...new Set(addresses)].sort((a, b) => (hexOf(a) < hexOf(b) ? -1 : 1));
  return {
    sorted,
    indexOf: (address) => {
      const i = sorted.indexOf(address);
      if (i < 0) throw new Error(`Account ${address} is not in the writable list`);
      return 2 + i;
    },
  };
}

/** opcode 2, two u16 account indices, a u64 amount. Same bytes for native and token transfers. */
export function transferInstruction(fromIdx: number, toIdx: number, amount: bigint): Uint8Array {
  const out = new Uint8Array(13);
  const v = new DataView(out.buffer);
  v.setUint8(0, 2);
  v.setUint16(1, fromIdx, true);
  v.setUint16(3, toIdx, true);
  v.setBigUint64(5, amount, true);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Native transfer out of the wallet, authorised by the passkey. */
export function nativeTransferIntent(wallet: string, to: string, amount: bigint): TransactionIntent {
  const { indexOf } = orderWritable([wallet, to]);
  return {
    walletAddress: wallet,
    programAddress: PROGRAMS.passkeyManager,
    instructionData: toBase64(transferInstruction(indexOf(wallet), indexOf(to), amount)),
    readWriteAddresses: [wallet, to],
    readOnlyAddresses: [],
    review: { appName: "Waypoint", programAddress: PROGRAMS.passkeyManager, instruction: `Send ${amount.toString()} THRU` },
  };
}

/** Token transfer between two token accounts. The wallet adds the owner wallet to the writable set, so it is listed here too. */
export function tokenTransferIntent(wallet: string, fromTokenAccount: string, toTokenAccount: string, amount: bigint, label: string): TransactionIntent {
  const { indexOf } = orderWritable([fromTokenAccount, toTokenAccount, wallet]);
  return {
    walletAddress: wallet,
    programAddress: PROGRAMS.token,
    instructionData: toBase64(transferInstruction(indexOf(fromTokenAccount), indexOf(toTokenAccount), amount)),
    readWriteAddresses: [fromTokenAccount, toTokenAccount, wallet],
    readOnlyAddresses: [],
    review: { appName: "Waypoint", programAddress: PROGRAMS.token, instruction: label },
  };
}
