export const short = (value: string, head = 6, tail = 6): string => (value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`);

export function formatTime(ms: number | undefined): string {
  if (ms === undefined) return "time unavailable";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export const grouped = (n: bigint | number | undefined): string => (n === undefined ? "—" : Number(n).toLocaleString("en-US"));
export const msText = (n: number | undefined): string => (n === undefined ? "—" : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`);

/** Raw token units to a decimal string, e.g. 1000 with 6 decimals is "0.001". */
export function formatUnits(raw: bigint, decimals: number): string {
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
