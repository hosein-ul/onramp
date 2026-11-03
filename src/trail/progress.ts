import type { Mission } from "../../missions/types";
import type { MissionStatus } from "./trail";

export type StopState = "done" | "here" | "next";

/** Display states derived from chain-backed statuses only: verified is "done", the first open mission is "here". */
export function stopStates(missions: Mission[], statuses: Record<string, MissionStatus | undefined>): StopState[] {
  let hereSet = false;
  return missions.map((m) => {
    if (statuses[m.id]?.state === "verified") return "done";
    if (!hereSet) { hereSet = true; return "here"; }
    return "next";
  });
}
