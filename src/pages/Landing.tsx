import { MISSIONS_V1 } from "../../missions/v1";
import { NETWORK, SITE } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { stopStates } from "../trail/progress";
import { useTrail } from "../trail/useTrail";
import { Cluster } from "../ui/Cluster";
import { MissionIndex } from "../ui/MissionIndex";
import { Stamp } from "../ui/stamp";
import { grouped, msText, short } from "../ui/format";
import { toHex } from "../lib/bytes";
import { useWallet } from "../wallet/wallet";

const BYTES = Array.from({ length: 96 }, (_, i) => ((i * 2654435761) >>> 0) % 100 > 42);

export function Landing({ pulse }: { pulse: Pulse }) {
  const w = useWallet();
  const trail = useTrail(w.address);
  const missions = MISSIONS_V1.missions;
  const states = stopStates(missions, trail.statuses);
  const next = states.findIndex((s) => s !== "done");
  const resuming = trail.verifiedCount > 0 && next >= 0;
  const latest = pulse.ticks[pulse.ticks.length - 1];
  const hash = latest ? toHex(latest.hash) : "";
  return (
    <>
      <header className="intro">
        <h1>Learn Thru <span>by using it.</span></h1>
        <div>
          <p className="lede">Five short missions on a live network. Do the thing, and the chain itself confirms it. Every result is read from on-chain data, and every one earns a stamp.</p>
          <div className="cta">
            <a className="btn primary" href={resuming ? `#/trail/${missions[next]!.id}` : "#/trail"}>{resuming ? `Resume at mission ${next + 1}` : "Start the trail"}</a>
            <a className="btn" href="#/lab">Open the Lab</a>
            <span className="fine">{resuming ? `${trail.verifiedCount} of ${missions.length} verified on-chain for this wallet` : `About 10 minutes · ${NETWORK.name} test network · nothing stored on a server`}</span>
          </div>
        </div>
      </header>
      <Cluster pulse={pulse} />
      {pulse.status === "error" && <p className="banner bad" role="alert">The network did not answer: {pulse.error ?? "unknown error"}. Waypoint keeps retrying. Nothing on this page is simulated.</p>}

      <div style={{ marginTop: 40 }}>
        {!w.address && <p className="fine" style={{ margin: "0 0 14px" }}>Connect a wallet and this index fills with your stamps. Until then it shows the route.</p>}
        <MissionIndex missions={missions} trail={trail} />
      </div>

      <section className="sec" aria-labelledby="diff-h">
        <div className="sec-h"><div><p className="eyebrow">Instruments</p><h2 id="diff-h">See what Thru is made of.</h2></div><p>Three things you can read straight off the network. Open the Lab to take each one apart, live.</p></div>
        <ul className="insts">
          <li>
            <span className="n">A</span><h3>Prices that live on chain</h3><p>A program keeps real exchange prices written into accounts. Any other program can read them.</p>
            <div className="art pf">{[["THRU / USD", "+2.1%"], ["BTC / USD", "−0.4%"], ["ETH / USD", "+0.9%"]].map(([n, c]) => <div key={n}><b style={{ fontWeight: 500 }}>{n}</b><span style={{ color: "var(--ink-3)" }}>{c}</span><span>···</span></div>)}</div>
            <a className="btn ghost small" href="#/lab/oracle">See the live feeds</a>
          </li>
          <li>
            <span className="n">B</span><h3>One signature, many updates</h3><p>A real transaction names every account it writes and declares its budget up front.</p>
            <div className="art"><div className="bt" aria-hidden="true">{BYTES.map((on, i) => <i key={i} className={on ? "" : "o"} />)}</div></div>
            <a className="btn ghost small" href="#/lab/tx">Take one apart</a>
          </li>
          <li>
            <span className="n">C</span><h3>Programs are RISC-V code</h3><p>A contract is standard RISC-V instructions in an account. Read a real one, instruction by instruction.</p>
            <div className="art"><div className="mini" aria-hidden="true"><div><span>0x1000</span><b>addi</b><span>sp, sp, -16</span></div><div><span>0x1004</span><b>sd</b><span>ra, 8(sp)</span></div><div className="hl"><span>0x1008</span><b>beqz</b><span>a5, 0x1044</span></div></div></div>
            <a className="btn ghost small" href="#/lab/code">Read the code</a>
          </li>
        </ul>
        <p className="cap">The pictures above are illustrations. The Lab shows live data from {NETWORK.name}.</p>
      </section>

      <section className="sec" aria-labelledby="make-h">
        <div className="sec-h"><div><p className="eyebrow">Stamps</p><h2 id="make-h">Every proof has a face.</h2></div><p>A stamp is drawn from the signature on chain, so each one is different. It is a keepsake. The proof is the chain.</p></div>
        <div className="make">
          <div>
            <h3>How a stamp is made</h3>
            <ol>
              <li><b>01 READ</b>Waypoint finds the transaction that completed your mission.</li>
              <li><b>02 SEED</b>Its signature becomes the seed.</li>
              <li><b>03 DRAW</b>The seed fills a 24 × 24 grid, mirrored and dithered.</li>
              <li><b>04 KEEP</b>The stamp goes on your receipt. Anyone opening the receipt triggers the same reads.</li>
            </ol>
          </div>
          <div className="viz">
            <div className="sig"><b>latest finalized block hash</b><br />{hash ? `${hash.slice(0, 32)}…` : "waiting for the network…"}<br /><br /><b>slot</b> {grouped(pulse.height)}</div>
            <div className="arrow">seed →</div>
            <div className="center"><Stamp seed={hash || "waypoint"} label={`SLOT ${pulse.height ? String(pulse.height).slice(-5) : "·····"}`} width={150} /><span className="fine">Drawn live from the block above</span></div>
          </div>
        </div>
      </section>

      <section className="proof" aria-labelledby="trust-h">
        <div>
          <p className="eyebrow">Nothing to take on trust</p>
          <h2 id="trust-h">No login. No server. Just the chain.</h2>
          <p>Waypoint has no database. A receipt carries only pointers; the page that opens it reads the chain again and shows what the chain says.</p>
          <ul>
            <li>We read, you act. The wallet signs on your device.<b>RULE 1</b></li>
            <li>A transaction that lands but fails does not count.<b>RULE 2</b></li>
            <li>Progress is recomputed on every visit.<b>RULE 3</b></li>
          </ul>
        </div>
        <figure className="wire">
          <figcaption>A live read, from your browser</figcaption>
          <pre>
            <span className="c">{`POST ${NETWORK.rpcUrl.replace("https://", "")}`}</span>{"\n"}
            <span className="c">QueryService/</span>GetHeight{"\n"}
            <span className="a">→</span> finalized <b>{grouped(pulse.height)}</b>{"  "}<span className="c">{msText(pulse.latencyMs)}</span>{"\n\n"}
            <span className="c">QueryService/</span>GetBlock{"\n"}
            <span className="a">→</span> hash <b>{latest ? short(hash, 10, 8) : "…"}</b>
          </pre>
        </figure>
      </section>
      <p className="small-print">{SITE.disclaimer}</p>
    </>
  );
}
