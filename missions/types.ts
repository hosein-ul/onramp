/** A mission is pure data. Adding one means adding an entry to a versioned list; no component changes. */
export type ActionKind = "wallet-connect" | "external" | "wallet-transfer" | "wallet-token-account" | "wallet-token-transfer";

export interface MissionStep {
  text: string;
  /** Shown in a monospace block under the step, e.g. a CLI command. */
  code?: string;
}

export interface Mission {
  id: string;
  title: string;
  goal: string;
  /** Plain-language explanation of any term a newcomer may not know. */
  gloss?: string;
  steps: MissionStep[];
  action: { kind: ActionKind; label: string; href?: string };
  /** Which verifier in src/verify runs. */
  verifier: "wallet" | "native-balance" | "native-transfer" | "token-account" | "token-transfer";
  /** The RPC reads the verifier performs, shown to the user so nothing is a black box. */
  reads: string;
  /** Ids of missions that must be verified first. */
  requires: string[];
}

export interface MissionSet {
  version: number;
  missions: Mission[];
}
