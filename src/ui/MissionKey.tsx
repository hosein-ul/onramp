import type { Mission } from "../../missions/types";
import type { MissionStatus } from "../trail/trail";

const LABEL: Record<MissionStatus["state"], string> = { checking: "Checking", locked: "Locked", ready: "Your turn", verifying: "Verifying", verified: "Verified", error: "Can't read network" };

export function MissionKey({ mission, index, status, onOpen }: { mission: Mission; index: number; status: MissionStatus; onOpen: () => void }) {
  return (
    <button type="button" className={`key ${status.state}`} onClick={onOpen} aria-label={`Mission ${index + 1}: ${mission.title}. ${LABEL[status.state]}.`}>
      <i className="lamp" aria-hidden="true" />
      <span className="n">{String(index + 1).padStart(2, "0")}</span>
      <strong>{mission.title}</strong>
      <span className="g">{mission.goal}</span>
      <code>{mission.reads}</code>
      <em>{LABEL[status.state]}</em>
    </button>
  );
}
