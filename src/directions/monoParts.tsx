import { useEffect, useRef } from "react";
import { seeded } from "../lib/bytes";

/** Rolling digits. Each digit is a column of 0-9 that slides to its value. */
export function Odometer({ value }: { value: string }) {
  return (
    <span className="od" aria-label={value} role="text">
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="od-d" key={i} aria-hidden="true">
            <span className="od-col" style={{ transform: `translateY(${-Number(ch)}em)` }}>
              {"0123456789".split("").map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        ) : (
          <span className="od-s" key={i} aria-hidden="true">{ch}</span>
        ),
      )}
    </span>
  );
}

/**
 * A halftone field of dots. Its shape comes from the block hash; every new block sends a ripple across it.
 * Monochrome on purpose: richness comes from the dot size, not from colour.
 */
export function DitherField({ seed, height }: { seed: Uint8Array | undefined; height: bigint | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ripple = useRef<{ t0: number; x: number; y: number }>({ t0: -1e9, x: 0.5, y: 0.5 });
  const seedRef = useRef(seed);
  seedRef.current = seed;

  useEffect(() => {
    if (height === undefined) return;
    const rand = seeded(seedRef.current ?? new Uint8Array(32));
    ripple.current = { t0: performance.now(), x: 0.15 + rand() * 0.7, y: 0.2 + rand() * 0.6 };
  }, [height]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0, h = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const draw = (now: number) => {
      const rand = seeded(seedRef.current ?? new Uint8Array(32).fill(9));
      const f = [0, 1, 2].map(() => ({ a: 1.5 + rand() * 3.5, b: 1.5 + rand() * 3.5, p: rand() * 6.283 }));
      const t = reduce ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      const cell = Math.max(9, Math.min(14, w / 90));
      const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      const rp = ripple.current;
      const age = (now - rp.t0) / 1000;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = i / cols, v = j / rows;
          let n = 0;
          for (const k of f) n += Math.sin(u * k.a * 3 + t * 0.35 + k.p) * Math.cos(v * k.b * 3 - t * 0.28 + k.p * 0.7);
          n = (n / 3 + 1) / 2; // 0..1
          const dx = (u - rp.x) * (w / h), dy = v - rp.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const ring = age < 3 ? Math.exp(-Math.pow((d - age * 0.55) * 9, 2)) * (1 - age / 3) : 0;
          const fade = 0.25 + 0.75 * Math.min(1, u * 1.6); // denser toward the right
          const r = Math.max(0, Math.min(1, (n * 0.75 + ring * 0.9) * fade)) * (cell * 0.5);
          if (r < 0.4) continue;
          ctx.beginPath();
          ctx.arc(i * cell + cell / 2, j * cell + cell / 2, r, 0, 6.283);
          ctx.fillStyle = `rgba(255,255,255,${0.14 + ring * 0.6})`;
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="dither" aria-hidden="true" />;
}

/** Line chart with an endpoint marker, a faint grid and a baseline label. */
export function Sparkline({ data, unit = "ms" }: { data: number[]; unit?: string }) {
  const W = 320, H = 96, P = 6;
  const max = Math.max(50, ...data) * 1.15;
  const x = (i: number) => P + (i / Math.max(data.length - 1, 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Recent round-trip times, latest ${last ?? "unknown"} ${unit}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="g" />)}
      {data.length > 1 && <path d={`${path} L${x(data.length - 1)},${H} L${x(0)},${H} Z`} className="area" />}
      {data.length > 1 && <path d={path} className="line" fill="none" vectorEffect="non-scaling-stroke" />}
      {last !== undefined && <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" className="end" />}
    </svg>
  );
}

/** Five segments, one per mission. Filled segments are verified. */
export function Ring({ filled, total = 5, size = 132 }: { filled: number; total?: number; size?: number }) {
  const r = size / 2 - 8, c = size / 2, gap = 0.09;
  const arc = (i: number) => {
    const a0 = (i / total) * 6.283 - 1.5708 + gap / 2, a1 = ((i + 1) / total) * 6.283 - 1.5708 - gap / 2;
    const p = (a: number) => `${(c + Math.cos(a) * r).toFixed(1)} ${(c + Math.sin(a) * r).toFixed(1)}`;
    return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`;
  };
  return (
    <svg className="ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${filled} of ${total} missions verified`}>
      {Array.from({ length: total }, (_, i) => <path key={i} d={arc(i)} className={i < filled ? "on" : "off"} fill="none" />)}
      <text x={c} y={c + 2} textAnchor="middle" className="n">{filled}</text>
      <text x={c} y={c + 22} textAnchor="middle" className="of">of {total}</text>
    </svg>
  );
}

const ICONS: Record<string, JSX.Element> = {
  wallet: <><circle cx="8" cy="12" r="3.6" /><path d="M11.6 12H21M18 12v3.2M21 12v2.2" /></>,
  funds: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" /></>,
  transfer: <><path d="M4 8h14l-3-3.2M20 16H6l3 3.2" /></>,
  "token-account": <><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
  "token-transfer": <><circle cx="6.5" cy="12" r="2.8" /><path d="M10 12h10l-3-3.2M20 12l-3 3.2" /></>,
};

export function Icon({ id }: { id: string }) {
  return <svg className="ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">{ICONS[id]}</svg>;
}
