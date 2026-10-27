import { useEffect, useState } from "react";
import { useChainPulse } from "./chain/useChainPulse";
import { Chart } from "./directions/Chart";
import { Index } from "./directions/Index";
import { Stamp } from "./directions/Stamp";
import { Strip } from "./directions/Strip";
import { Landing } from "./ui/Landing";

const DIRECTIONS = { index: Index, strip: Strip, chart: Chart, stamp: Stamp, instrument: Landing } as const;
type Key = keyof typeof DIRECTIONS;

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
  const asked = new URLSearchParams(window.location.search).get("d") as Key | null;
  const key: Key = asked && asked in DIRECTIONS ? asked : "index";

  if (route === "trail") return <main style={{ padding: 32 }}>The trail is being built.</main>;
  const Dir = DIRECTIONS[key];
  return (
    <>
      <Dir pulse={pulse} onStart={() => go("trail")} />
      <nav aria-label="Design direction" style={{ position: "fixed", right: 12, bottom: 12, display: "flex", gap: 4, zIndex: 99, font: "12px monospace" }}>
        {(Object.keys(DIRECTIONS) as Key[]).map((k) => (
          <a key={k} href={`?d=${k}`} style={{ padding: "6px 10px", background: k === key ? "#000" : "#fff", color: k === key ? "#fff" : "#000", border: "1px solid #000", textDecoration: "none" }}>{k}</a>
        ))}
      </nav>
    </>
  );
}
