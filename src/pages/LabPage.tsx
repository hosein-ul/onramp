import { useEffect, useState } from "react";
import { NETWORK } from "../config";
import type { Pulse } from "../chain/useChainPulse";
import { OracleBoard } from "../labs/OracleBoard";
import { ProgramReader } from "../labs/ProgramReader";
import { TxAnatomy } from "../labs/TxAnatomy";
import { useOracle } from "../labs/oracle";
import "./lab.css";

export function LabPage({ pulse, section }: { pulse: Pulse; section?: string }) {
  const [dev, setDev] = useState(false);
  const o = useOracle();

  useEffect(() => {
    if (section) document.getElementById(`lab-${section}`)?.scrollIntoView({ block: "start" });
  }, [section, o.status]);

  return (
    <div className="lab">
      <header className="lab-head">
        <div>
          <p className="eyebrow">Sheet 3 · Details · {NETWORK.name}</p>
          <h1 className="h1s">What Thru is made of.</h1>
          <p className="lede">Three things you can read straight off the network. Every number and every instruction on this sheet is live data from {NETWORK.name}. Nothing is a recording.</p>
        </div>
        <label className="lab-switch">
          <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} />
          <span aria-hidden="true" className="sw" />
          <span>Developer view<small>show raw bytes and fields</small></span>
        </label>
      </header>

      {pulse.status === "error" && <p className="banner bad" role="alert">The network did not answer: {pulse.error}. Waypoint keeps retrying.</p>}

      <section className="lab-sec" id="lab-oracle" aria-labelledby="h-oracle">
        <div className="lab-intro">
          <span className="lab-n">DETAIL A</span>
          <h2 id="h-oracle">Prices that live on chain</h2>
          <p>A blockchain cannot look up a price on the internet by itself. Here, a program keeps real exchange prices written into accounts, and any other program can read them. These are the live feeds on {NETWORK.name}. Tap one to see where it lives.</p>
        </div>
        <OracleBoard o={o} dev={dev} />
      </section>

      <section className="lab-sec" id="lab-tx" aria-labelledby="h-tx">
        <div className="lab-intro">
          <span className="lab-n">DETAIL B</span>
          <h2 id="h-tx">One signature, many updates</h2>
          <p>This is a real transaction from the feeds above. It names every account it will write, asks for a budget before it runs, and reports exactly what it used. Pick another recent one to compare.</p>
        </div>
        <TxAnatomy o={o} dev={dev} />
      </section>

      <section className="lab-sec" id="lab-code" aria-labelledby="h-code">
        <div className="lab-intro">
          <span className="lab-n">DETAIL C</span>
          <h2 id="h-code">A program is just RISC-V code in an account</h2>
          <p>Thru runs standard RISC-V, the open instruction set used in chips. A smart contract here is those instructions stored in an account. Pick a real program and read it. Each instruction shows its cost in the Thru resource model.</p>
        </div>
        <ProgramReader dev={dev} />
      </section>
    </div>
  );
}
