import { lazy, Suspense, useEffect, useState } from "react";
import { useChainPulse } from "./chain/useChainPulse";
import { SITE } from "./config";
import { Landing } from "./pages/Landing";
import { parseReceiptRoute } from "./receipts/receipt";
import { Topbar } from "./ui/Topbar";
import { initWallet } from "./wallet/wallet";

const TrailPage = lazy(() => import("./pages/TrailPage").then((m) => ({ default: m.TrailPage })));
const LabPage = lazy(() => import("./pages/LabPage").then((m) => ({ default: m.LabPage })));
const ReceiptPage = lazy(() => import("./pages/ReceiptPage").then((m) => ({ default: m.ReceiptPage })));

const readRoute = () => window.location.hash.replace(/^#\/?/, "");

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
    <div className="app">
      <Topbar pulse={pulse} section={key} />
      <main>
        <Suspense fallback={<p className="loading" role="status">Loading…</p>}>
          {receipt ? <ReceiptPage r={receipt} /> : key === "trail" ? <TrailPage pulse={pulse} openId={id} /> : key === "lab" ? <LabPage pulse={pulse} section={id} /> : <Landing pulse={pulse} />}
        </Suspense>
      </main>
      <footer className="foot"><span>{SITE.disclaimer}</span><span>Built on the official @thru/* packages · Test network only</span></footer>
    </div>
  );
}
