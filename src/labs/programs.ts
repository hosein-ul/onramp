import { BOOTSTRAP_PROGRAM_ADDRESSES as A } from "@thru/programs/bootstrap-addresses";

export const PROGRAMS_EXTRA = { oracle: A.oracle, multicall: A.multicall, noop: A.noop, eoa: A.eoa, compression: A.compression, ratelimit: A.ratelimit, faucet: A.faucet, token: A.token } as const;

/** Programs worth reading, smallest first, with one plain sentence each. Sentences describe the program's role, taken from the Thru docs. */
export const READABLE_PROGRAMS = [
  { id: "noop", name: "Noop", address: A.noop, blurb: "Does nothing on purpose. The smallest real program on the network." },
  { id: "multicall", name: "Multicall", address: A.multicall, blurb: "Runs several calls to other programs inside one instruction." },
  { id: "eoa", name: "Externally owned account", address: A.eoa, blurb: "Backs ordinary key-controlled accounts: the one behind a plain transfer." },
  { id: "compression", name: "Compression", address: A.compression, blurb: "Helper program for moving accounts in and out of the compressed state." },
] as const;
