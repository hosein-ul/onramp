import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { grouped, msText } from "./format";

/** One line of live readings from the RPC. */
export function Cluster({ pulse }: { pulse: Pulse; compact?: boolean }) {
  return (
    <div className="netline" aria-label="Live network readings">
      <span>Network <b>{NETWORK.name}</b></span>
      <span>Finalized slot <b>{grouped(pulse.height)}</b></span>
      <span>RPC <b>{msText(pulse.latencyMs)}</b></span>
      <span>Block time <b>{msText(pulse.slotTimeMs)}</b></span>
    </div>
  );
}
