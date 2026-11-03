import { lazy, Suspense, useEffect, useState } from "react";
import { useChainPulse } from "./chain/useChainPulse";
import { NETWORK, SITE } from "./config";
import { Landing } from "./pages/Landing";
import { parseReceiptRoute } from "./receipts/receipt";
import { Topbar } from "./ui/Topbar";
import { grouped } from "./ui/format";
import { initWallet } from "./wallet/wallet";

const TrailPage = lazy(() => import("./pages/TrailPage").then((m) => ({ default: m.TrailPage })));
const LabPage = lazy(() => import("./pages/LabPage").then((m) => ({ default: m.LabPage })));
const ReceiptPage = lazy(() => import("./pages/ReceiptPage").then((m) => ({ default: m.ReceiptPage })));

const readRoute = () => window.location.hash.replace(/^#\/?/, "");
const SHEET: Record<string, string> = { "": "1 · Overview", trail: "2 · Schedule", lab: "3 · Details", receipt: "4 · Receipt" };

export function App() {
  const pulse = useChainPulse();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    // Restore a remembered wallet connection after the page has settled, so the landing page stays light.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const t = window.setTimeout(() => (idle ? idle(() => initWallet(), { timeout: 4000 }) : initWallet()), 2500);
    return () => { window.removeEventListener("hashchange", on); window.clearTimeout(t); };
  }, []);

  const receipt = parseReceiptRoute(route);
  const [section, id] = route.split("?")[0]?.split("/") ?? [""];
  const key = receipt ? "receipt" : section === "trail" || section === "lab" ? section : "";

  return (
    <div className="sheet">
      <div className="frame app">
        <div className="zones" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>
        <div className="pad">
          <Topbar pulse={pulse} section={key} />
          <main>
            <Suspense fallback={<p className="loading" role="status">Loading…</p>}>
              {receipt ? <ReceiptPage r={receipt} /> : key === "trail" ? <TrailPage pulse={pulse} openId={id} /> : key === "lab" ? <LabPage pulse={pulse} section={id} /> : <Landing pulse={pulse} />}
            </Suspense>
          </main>
          <footer className="foot">
            <div><small>Project</small><b>Waypoint</b> · {SITE.disclaimer}</div>
            <div><small>Sheet</small><b>{SHEET[key]}</b></div>
            <div><small>Network</small><b>{NETWORK.name}</b> · test only</div>
            <div><small>Finalized slot</small><b>{pulse.height ? grouped(pulse.height) : "…"}</b></div>
          </footer>
        </div>
      </div>
    </div>
  );
}
