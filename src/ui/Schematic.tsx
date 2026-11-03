import { useMemo } from "react";
import { MISSIONS_V1 } from "../../missions/v1";
import type { StopState } from "../trail/progress";

const NODES: [number, number][] = [[160, 500], [340, 500], [340, 330], [540, 330], [540, 150]];
const LABEL: [string, string][] = [["Wallet", "GetAccount"], ["Funds", "balance > 0"], ["Transfer", "no VM error"], ["Token account", "mint = THRUSD"], ["Move a token", "THRUSD out"]];
const ROUTE = `M${NODES[0]![0]} ${NODES[0]![1]} H${NODES[1]![0]} V${NODES[2]![1]} H${NODES[3]![0]} V${NODES[4]![1]}`;
const doneRoute = (n: number) => {
  const pts = NODES.slice(0, Math.max(n, 1));
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]!, [x, y] = pts[i]!;
    d += px === x ? ` V${y}` : ` H${x}`;
    if (px !== x && py !== y) d += ` V${y}`;
  }
  return d;
};

/** The trail drawn as a wiring schematic. Node states come from chain-verified progress. */
export function Schematic({ states }: { states: StopState[] }) {
  const missions = MISSIONS_V1.missions;
  const doneCount = states.filter((s) => s === "done").length;
  const path = useMemo(() => doneRoute(doneCount + 1), [doneCount]);
  return (
    <svg className="sch" viewBox="-30 0 820 640" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Trail route: ${doneCount} of ${missions.length} stops verified`}>
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${40 + i * 40} 0v8M${40 + i * 40} 640v-8`} className="d-thin" />)}
      <path d={ROUTE} className="d-thin" strokeDasharray="3 6" />
      {doneCount > 0 && <path key={path} d={path} className="d-line draw" style={{ ["--len" as string]: 900 }} />}
      {NODES.map(([x, y], i) => {
        const st = states[i] ?? "next";
        const m = missions[i]!;
        const right = i % 2 === 1;
        const lx = right ? x + 60 : x - 60, ly = right ? y - 70 : y + 70;
        return (
          <a key={m.id} href={`#/trail/${m.id}`} aria-label={`Stop ${i + 1}: ${m.title}`}>
            {st === "here" && <rect x={x - 26} y={y - 26} width="52" height="52" fill="none" stroke="#ffd60a" className="halo" />}
            <rect x={x - 18} y={y - 18} width="36" height="36" className="box" fill={st === "done" ? "#eaf3ff" : st === "here" ? "#ffd60a" : "#0b2c66"} stroke={st === "next" ? "#eaf3ff" : "none"} strokeWidth="1.5" />
            <text x={x} y={y + 6} textAnchor="middle" className="tn" fill={st === "next" ? "#eaf3ff" : "#0b2c66"}>{String(i + 1).padStart(2, "0")}</text>
            <path d={`M${x + (right ? 18 : -18)} ${y + (right ? -18 : 18)} L${lx} ${ly} H${lx + (right ? 110 : -100)}`} className="d-thin" />
            <text x={lx + (right ? 8 : -8)} y={ly - 8} textAnchor={right ? "start" : "end"} className="t1">{LABEL[i]![0]}</text>
            <text x={lx + (right ? 8 : -8)} y={ly + 18} textAnchor={right ? "start" : "end"} className="t2">{LABEL[i]![1]}</text>
          </a>
        );
      })}
      <path d="M160 590H540M160 582v16M540 582v16" className="d-thin" />
      <text x="350" y="614" textAnchor="middle" className="t2">5 stops · every result read from the chain</text>
      <g className="legend">
        {([["done", "#eaf3ff", "Verified"], ["here", "#ffd60a", "Open"], ["next", "none", "Ahead"]] as const).map(([k, c, t], i) => (
          <g key={k}><rect x="590" y={60 + i * 28 - 10} width="14" height="14" fill={c} stroke="#eaf3ff" strokeWidth="1.5" /><text x="614" y={60 + i * 28 + 2}>{t}</text></g>
        ))}
      </g>
    </svg>
  );
}
