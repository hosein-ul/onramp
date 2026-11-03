import { MISSIONS_V1 } from "../../missions/v1";
import { NETWORK, SITE } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { stopStates } from "../trail/progress";
import { useTrail } from "../trail/useTrail";
import { Cluster } from "../ui/Cluster";
import { Schematic } from "../ui/Schematic";
import { grouped, msText, short } from "../ui/format";
import { toHex } from "../lib/bytes";
import { useWallet } from "../wallet/wallet";

const FLOW = [
  { t: "You act", d: "The official Thru wallet signs on your device with your passkey. Waypoint never holds a key or moves funds.", c: "passkey → signature" },
  { t: "The network executes", d: "Validators run the transaction and record the result, including whether it succeeded.", c: "vmError · userErrorCode" },
  { t: "Waypoint reads", d: "Your browser asks the public RPC what the chain says. Read-only, nothing is written anywhere.", c: "GetAccount · GetTransaction" },
  { t: "You get a receipt", d: "A receipt holds only pointers. Whoever opens it triggers the same reads and sees the same answer.", c: "address · signature" },
];

export function Landing({ pulse }: { pulse: Pulse }) {
  const w = useWallet();
  const trail = useTrail(w.address);
  const missions = MISSIONS_V1.missions;
  const states = stopStates(missions, trail.statuses);
  const next = missions.findIndex((_, i) => states[i] !== "done");
  const resuming = trail.verifiedCount > 0 && next >= 0;
  const latest = pulse.ticks[pulse.ticks.length - 1];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Sheet 1 · An unofficial guide to Thru</p>
            <h1>Learn Thru <span>by using it.</span></h1>
            <p className="lede">Five short missions on a live network. Do the thing, and the chain itself confirms it. Every result is read from on-chain data.</p>
            <div className="cta">
              <a className="btn primary" href={resuming ? `#/trail/${missions[next]!.id}` : "#/trail"}>{resuming ? `Resume at stop ${String(next + 1).padStart(2, "0")}` : "Start the trail"}</a>
              <a className="btn" href="#/lab">Open the Lab</a>
              <span className="fine">{resuming ? `${trail.verifiedCount} of ${missions.length} verified on-chain for this wallet` : `About 10 minutes · ${NETWORK.name} test network · nothing stored on a server`}</span>
            </div>
          </div>
          <p className="fine" style={{ margin: 0 }}>Unofficial community project · test network only</p>
        </div>
        <div className="hero-fig"><Schematic states={states} /></div>
      </section>
      <Cluster pulse={pulse} />
      {pulse.status === "error" && <p className="banner bad" role="alert">The network did not answer: {pulse.error ?? "unknown error"}. Waypoint keeps retrying. Nothing on this page is simulated.</p>}

      <section className="sec" aria-labelledby="diff-h">
        <div className="sec-head"><div><p className="eyebrow">Sheet 2 · Details</p><h2 id="diff-h">What Thru is made of</h2></div><p>Three things you can read straight off the network, live. No recordings. Open the Lab to take each one apart.</p></div>
        <ul className="diff-grid">
          <li>
            <span className="n">DETAIL A</span><h3>Prices that live on chain</h3>
            <svg viewBox="0 0 280 96" aria-hidden="true"><rect x="1" y="1" width="278" height="94" className="l" />{[0, 1, 2].map((r) => <g key={r}><text x="14" y={26 + r * 26}>{["THRU / USD", "BTC / USD", "ETH / USD"][r]}</text><polyline className="l" points={`150,${28 + r * 26} 170,${22 + r * 26} 190,${26 + r * 26} 210,${18 + r * 26} 230,${22 + r * 26} 266,${14 + r * 26}`} /></g>)}</svg>
            <p>A program keeps real exchange prices written into accounts. Any other program can read them.</p>
            <a className="btn ghost small" href="#/lab/oracle">See the live feeds</a>
          </li>
          <li>
            <span className="n">DETAIL B</span><h3>One signature, many updates</h3>
            <svg viewBox="0 0 280 96" aria-hidden="true"><rect x="1" y="30" width="278" height="36" className="l" />{[40, 120, 160, 190, 230].map((x) => <path key={x} d={`M${x} 30v36`} className="l" />)}<rect x="231" y="31" width="47" height="34" className="y" /><text x="2" y="86">signature · accounts · budget · data</text></svg>
            <p>A real transaction names every account it writes and declares its budget up front.</p>
            <a className="btn ghost small" href="#/lab/tx">Take one apart</a>
          </li>
          <li>
            <span className="n">DETAIL C</span><h3>Programs are RISC-V code</h3>
            <svg viewBox="0 0 280 96" aria-hidden="true"><rect x="1" y="1" width="278" height="94" className="l" />{["addi  sp, sp, -16", "sd    ra, 8(sp)", "beqz  a5, 0x1044"].map((t, i) => <g key={t}><rect x="1" y={6 + i * 26} width="278" height="24" className={i === 2 ? "f" : ""} fill={i === 2 ? undefined : "none"} /><text x="14" y={22 + i * 26}>{t}</text></g>)}</svg>
            <p>A contract is standard RISC-V instructions in an account. Read a real one, instruction by instruction.</p>
            <a className="btn ghost small" href="#/lab/code">Read the code</a>
          </li>
        </ul>
        <p className="cap">Diagrams above are illustrations. The Lab shows live data from {NETWORK.name}.</p>
      </section>

      <section className="sec" aria-labelledby="route-h">
        <div className="sec-head"><div><p className="eyebrow">Sheet 3 · Schedule</p><h2 id="route-h">Five stops</h2></div><p>Each one lists the exact chain reads that decide it. A transaction that lands but fails does not count.</p></div>
        <table className="sched">
          <thead><tr><th>No.</th><th>Mission</th><th>Read from chain</th></tr></thead>
          <tbody>
            {missions.map((m, i) => (
              <tr key={m.id}><td className="no">{String(i + 1).padStart(2, "0")}</td><td><h3>{m.title}</h3><p>{m.goal}</p></td><td className="rd">{m.reads}</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 24 }}><a className="btn primary" href="#/trail">{resuming ? "Continue the trail" : "Start the trail"}</a></p>
      </section>

      <section className="sec" aria-labelledby="how-h">
        <div className="sec-head"><div><p className="eyebrow">Sheet 4 · Method</p><h2 id="how-h">How a mission gets verified</h2></div><p>Four steps, and only the first one involves you. After that, the chain and your browser do the work.</p></div>
        <div className="flow">
          {FLOW.map((f, i) => <div key={f.t}><span className="n">STEP {String(i + 1).padStart(2, "0")}</span><h3>{f.t}</h3><p>{f.d}</p><code>{f.c}</code></div>)}
        </div>
      </section>

      <section className="sec" aria-labelledby="trust-h">
        <div className="tb">
          <div className="big">
            <div>
              <p className="eyebrow">Nothing to take on trust</p>
              <h2 id="trust-h">No login. No server. Just the chain.</h2>
              <p>Waypoint has no database. Progress is recomputed from on-chain data on every visit, so it cannot drift from the truth.</p>
              <ul style={{ marginTop: 24 }}>
                <li><span><b>We read, you act.</b> The wallet signs on your device.</span></li>
                <li><span><b>The chain keeps score.</b> Nothing is stored on a server.</span></li>
                <li><span><b>Failed does not count.</b> Only a transaction the network executed without error verifies a mission.</span></li>
              </ul>
            </div>
            <figure className="wire">
              <figcaption>A live read, from your browser</figcaption>
              <pre>
                <span className="c">{`POST ${NETWORK.rpcUrl.replace("https://", "")}`}</span>{"\n"}
                <span className="c">QueryService/</span>GetHeight{"\n"}
                <span className="a">→</span> finalized <b>{grouped(pulse.height)}</b>{"  "}<span className="c">{msText(pulse.latencyMs)}</span>{"\n\n"}
                <span className="c">QueryService/</span>GetBlock{"\n"}
                <span className="a">→</span> hash <b>{latest ? short(toHex(latest.hash), 10, 8) : "…"}</b>
              </pre>
            </figure>
          </div>
          <div className="wide"><small>Built on</small><span>the official @thru/* packages</span></div><div><small>Network</small><span>{NETWORK.name} · test only</span></div>
        </div>
      </section>
      <p className="small-print">{SITE.disclaimer}</p>
    </>
  );
}
