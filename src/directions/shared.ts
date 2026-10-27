import { MISSIONS_V1 } from "../../missions/v1";
import type { Pulse } from "../chain/useChainPulse";

export type PreviewState = "verified" | "ready" | "locked";

/** Design previews only: a fixed mix of states so every direction shows all three. */
export const PREVIEW_STATES: PreviewState[] = ["verified", "verified", "ready", "locked", "locked"];
export const stops = MISSIONS_V1.missions;

export function grouped(height: bigint | undefined): string {
  return height === undefined ? "—" : Number(height).toLocaleString("en-US");
}
export function ms(n: number | undefined): string {
  return n === undefined ? "—" : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`;
}
export interface DirectionProps {
  pulse: Pulse;
  onStart: () => void;
}
