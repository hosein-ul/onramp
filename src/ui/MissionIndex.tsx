import type { Mission } from "../../missions/types";
import type { Trail } from "../trail/useTrail";
import { Stamp } from "./stamp";

const LABEL = { checking: "Checking", locked: "Locked", ready: "Your turn", verifying: "Verifying", verified: "Verified", error: "Can't read network" } as const;

/** The numbered index of missions. A verified mission shows its stamp, drawn from the on-chain signature. */
export function MissionIndex({ missions, trail, header = true }: { missions: Mission[]; trail: Trail; header?: boolean }) {
  return (
    <section className="idx" aria-label="Missions">
      {header && <div className="idx-h" aria-hidden="true"><span>No.</span><span>Mission</span><span>Read from chain</span><span>Stamp</span><span style={{ textAlign: "right" }}>Status</span></div>}
      {missions.map((m, i) => {
        const st = trail.statuses[m.id] ?? { state: "checking" as const };
        const e = st.evidence;
        const n = String(i + 1).padStart(2, "0");
        return (
          <a key={m.id} data-mission={m.id} className={`irow ${st.state}`} href={`#/trail/${m.id}`} aria-label={`Mission ${i + 1}: ${m.title}. ${LABEL[st.state]}.`}>
            <div className="no">{i + 1}</div>
            <div>
              <h3>{m.title}</h3>
              <p>{m.goal}</p>
              {st.state === "ready" && <span className="go"><span>Open mission</span></span>}
            </div>
            <div className="rd">{m.reads}</div>
            <div className="slot">
              {st.state === "verified" && e ? <Stamp seed={e.signature ?? `${e.address}:${m.id}`} label={`${n} · VERIFIED`} /> : <div className="empty">{st.state === "ready" ? "Your stamp appears when the chain confirms" : "—"}</div>}
            </div>
            <span className="st">{LABEL[st.state]}</span>
          </a>
        );
      })}
    </section>
  );
}
