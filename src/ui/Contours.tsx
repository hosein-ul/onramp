import { useMemo } from "react";
import { seeded } from "../lib/bytes";

interface Props {
  /** Block hash bytes. The same hash always draws the same map. */
  seed: Uint8Array | undefined;
  lines?: number;
}

const TAU = Math.PI * 2;

/** A topographic map whose shape is derived from a real block hash. */
export function Contours({ seed, lines = 18 }: Props) {
  const paths = useMemo(() => {
    const rand = seeded(seed ?? new Uint8Array(32).fill(7));
    const harmonics = [0, 1, 2].map(() => ({
      freq: 2 + Math.floor(rand() * 4),
      phase: rand() * TAU,
      amp: 0.05 + rand() * 0.09,
    }));
    const cx = 400 + (rand() - 0.5) * 120;
    const cy = 400 + (rand() - 0.5) * 120;
    const out: string[] = [];
    for (let k = 1; k <= lines; k++) {
      const base = 26 + k * 21;
      const warp = 0.6 + k / lines;
      const pts: string[] = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * TAU;
        let r = base;
        for (const h of harmonics) r += base * h.amp * warp * Math.sin(h.freq * a + h.phase + k * 0.11);
        pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r * 0.82).toFixed(1)}`);
      }
      out.push(`M${pts.join("L")}Z`);
    }
    return out;
  }, [seed, lines]);

  return (
    <svg className="contours" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" strokeWidth={i % 5 === 0 ? 1.25 : 0.75} className={i % 5 === 0 ? "major" : undefined} />
      ))}
    </svg>
  );
}
