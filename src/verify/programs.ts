import { BOOTSTRAP_PROGRAM_ADDRESSES } from "@thru/programs/bootstrap-addresses";

/** Core program addresses. Verified deployed on Alphanet and Betanet (see docs/phase0.md). */
export const PROGRAMS = {
  passkeyManager: BOOTSTRAP_PROGRAM_ADDRESSES.passkey_manager,
  token: BOOTSTRAP_PROGRAM_ADDRESSES.token,
  faucet: BOOTSTRAP_PROGRAM_ADDRESSES.faucet,
  eoa: BOOTSTRAP_PROGRAM_ADDRESSES.eoa,
} as const;
