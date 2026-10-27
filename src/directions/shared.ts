import { MISSIONS_V1 } from "../../missions/v1";
import type { Pulse } from "../chain/useChainPulse";

export type PreviewState = "verified" | "ready" | "locked";

/** Design previews only: a fixed mix of states so every direction shows all three. */
export const PREVIEW_STATES: PreviewState[] = ["verified", "verified", "ready", "locked", "locked"];
export const stops = MISSIONS_V1.missions;

export const grouped = (h: bigint | undefined): string => (h === undefined ? "—" : Number(h).toLocaleString("en-US"));
export const ms = (n: number | undefined): string => (n === undefined ? "—" : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`);
export const stateLabel = { verified: "Verified", ready: "Your turn", locked: "Locked" } as const;

export interface DirectionProps {
  pulse: Pulse;
  onStart: () => void;
}
