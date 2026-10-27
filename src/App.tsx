import { useEffect, useState } from "react";
import { useChainPulse } from "./chain/useChainPulse";
import { Landing } from "./ui/Landing";

function useHashRoute(): [string, (r: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, "");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [route, (r) => (window.location.hash = r ? `/${r}` : "")];
}

export function App() {
  const pulse = useChainPulse();
  const [route, go] = useHashRoute();

  if (route === "trail") {
    return (
      <main className="page">
        <p style={{ padding: 32 }}>The trail is being built.</p>
      </main>
    );
  }
  return <Landing pulse={pulse} onStart={() => go("trail")} />;
}
