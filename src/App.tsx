import { useEffect, useState } from "react";
import { useChainPulse } from "./chain/useChainPulse";
import { SITE } from "./config";
import { Landing } from "./pages/Landing";
import { ReceiptPage } from "./pages/ReceiptPage";
import { TrailPage } from "./pages/TrailPage";
import { parseReceiptRoute } from "./receipts/receipt";
import { useTrail } from "./trail/useTrail";
import { Topbar } from "./ui/Topbar";
import { initWallet, useWallet } from "./wallet/wallet";

const readRoute = () => window.location.hash.replace(/^#\/?/, "");

export function App() {
  const pulse = useChainPulse();
  const wallet = useWallet();
  const trail = useTrail(wallet.address);
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    initWallet();
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const receipt = parseReceiptRoute(route);
  const [section, id] = route.split("?")[0]?.split("/") ?? [""];

  return (
    <div className="app">
      <Topbar pulse={pulse} />
      <main>
        {receipt ? <ReceiptPage r={receipt} /> : section === "trail" ? <TrailPage pulse={pulse} trail={trail} openId={id} /> : <Landing pulse={pulse} />}
      </main>
      <footer className="foot"><span>{SITE.disclaimer}</span><span>Built on the official @thru/* packages · Test network only</span></footer>
    </div>
  );
}
