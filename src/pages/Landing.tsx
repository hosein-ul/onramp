import { MISSIONS_V1 } from "../../missions/v1";
import { NETWORK, SITE } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { Cluster } from "../ui/Cluster";
import { grouped, msText, short } from "../ui/format";
import { toHex } from "../lib/bytes";

export function Landing({ pulse }: { pulse: Pulse }) {
  const latest = pulse.ticks[pulse.ticks.length - 1];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">An unofficial guide to Thru</p>
          <h1>Learn Thru<br />by using it.</h1>
          <p className="lede">Five short missions on a live network. Watch the instruments move, do the thing, and the chain itself confirms it. Every result is read from on-chain data.</p>
          <div className="cta">
            <a className="btn primary" href="#/trail">Start the trail</a>
            <span className="fine">About 10 minutes · {NETWORK.name} test network · nothing stored on a server</span>
          </div>
        </div>
        <Cluster pulse={pulse} />
        {pulse.status === "error" && <p className="banner bad" role="alert">The network did not answer: {pulse.error ?? "unknown error"}. Waypoint keeps retrying. Nothing on this page is simulated.</p>}
      </section>

      <section className="diff" aria-labelledby="diff-h">
        <div className="sec-head"><h2 id="diff-h">What Thru is made of</h2><p>Three things you can read straight off the network, live. No recordings.</p></div>
        <ul className="diff-grid">
          <li><span className="n">01</span><h3>Prices that live on chain</h3><p>A program keeps real exchange prices written into accounts. Any other program can read them.</p><a className="btn ghost" href="#/lab/oracle">See the live feeds</a></li>
          <li><span className="n">02</span><h3>One signature, many updates</h3><p>A real transaction names every account it writes and declares its budget up front.</p><a className="btn ghost" href="#/lab/tx">Take one apart</a></li>
          <li><span className="n">03</span><h3>Programs are RISC-V code</h3><p>A contract is standard RISC-V instructions in an account. Read a real one, instruction by instruction.</p><a className="btn ghost" href="#/lab/code">Read the code</a></li>
        </ul>
      </section>

      <section className="route" aria-labelledby="route-h">
        <div className="sec-head"><h2 id="route-h">The trail</h2><p>Five stops. Each one lists the exact chain reads that decide it.</p></div>
        <ol className="stops">
          {MISSIONS_V1.missions.map((m, i) => (
            <li key={m.id}><span className="n">{String(i + 1).padStart(2, "0")}</span><h3>{m.title}</h3><p>{m.goal}</p><code>{m.reads}</code></li>
          ))}
        </ol>
        <a className="btn primary" href="#/trail">Start the trail</a>
      </section>

      <section className="trust" aria-labelledby="trust-h">
        <div>
          <h2 id="trust-h">Nothing to take on trust</h2>
          <ul>
            <li><b>We read, you act.</b> Waypoint never holds a key or moves funds. The official Thru wallet signs on your device with your passkey.</li>
            <li><b>The chain keeps score.</b> Progress is recomputed from on-chain data on every visit. There is no server and no database.</li>
            <li><b>A transaction that fails does not count.</b> A mission is verified only when the network executed it without error.</li>
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
      </section>
      <p className="small-print">{SITE.disclaimer}</p>
    </>
  );
}
