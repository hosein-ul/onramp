import { useEffect, useMemo, useState } from "react";
import { AccountView } from "@thru/sdk";
import { chain } from "../chain/client";
import { NETWORK } from "../config";
import { grouped, short } from "../ui/format";
import { disassemble, splitExecutable, type Insn, type InsnKind } from "./riscv";
import { READABLE_PROGRAMS } from "./programs";

const KIND_LABEL: Record<InsnKind, string> = { alu: "arithmetic", mem: "memory", branch: "branch", jump: "jump", syscall: "syscall", mul: "multiply / divide", bit: "bit tricks", hash: "SHA hardware", other: "other", data: "data" };
const KINDS: InsnKind[] = ["alu", "mem", "branch", "jump", "mul", "bit", "hash", "syscall", "data"];

interface Loaded { bytes: number; version: number; trailerOk: boolean; insns: Insn[] }
const cache = new Map<string, Loaded>();

async function load(address: string): Promise<Loaded> {
  const hit = cache.get(address);
  if (hit) return hit;
  const acc = await chain().accounts.get(address, { view: AccountView.FULL });
  const data = new Uint8Array(acc.data?.data ?? []);
  const exe = splitExecutable(data);
  if (!exe) throw new Error("This account is not a Thru executable.");
  const v = { bytes: data.length, version: exe.version, trailerOk: exe.trailerOk, insns: disassemble(exe.code) };
  cache.set(address, v);
  return v;
}

export function ProgramReader({ dev }: { dev: boolean }) {
  const [id, setId] = useState<string>(READABLE_PROGRAMS[1].id);
  const prog = READABLE_PROGRAMS.find((p) => p.id === id) ?? READABLE_PROGRAMS[0];
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState(60);

  useEffect(() => {
    let live = true;
    setData(null); setErr(""); setRows(60);
    load(prog.address).then((v) => live && setData(v), (e) => live && setErr(e instanceof Error ? e.message : "Could not read the program."));
    return () => { live = false; };
  }, [prog.address]);

  const stats = useMemo(() => {
    if (!data) return null;
    const code = data.insns.filter((i) => i.kind !== "data");
    const by = new Map<InsnKind, number>();
    for (const i of data.insns) by.set(i.kind, (by.get(i.kind) ?? 0) + 1);
    const calls = new Map<string, number>();
    for (const i of data.insns) if (i.syscall) calls.set(i.syscall.name, (calls.get(i.syscall.name) ?? 0) + 1);
    const compressed = code.filter((i) => i.size === 2).length;
    const dataBytes = data.insns.filter((i) => i.kind === "data").reduce((n, i) => n + i.size, 0);
    return { code: code.length, by, calls: [...calls.entries()].sort((a, b) => b[1] - a[1]), compressedPct: code.length ? Math.round((compressed / code.length) * 100) : 0, dataBytes };
  }, [data]);

  return (
    <div className="lab-card">
      <div className="pr-pick" role="group" aria-label="Choose a program">
        {READABLE_PROGRAMS.map((p) => <button key={p.id} type="button" className={p.id === id ? "on" : ""} aria-pressed={p.id === id} onClick={() => setId(p.id)}>{p.name}</button>)}
      </div>
      <p className="pr-blurb">{prog.blurb} <a href={`${NETWORK.explorerUrl}/address/${prog.address}`} target="_blank" rel="noreferrer noopener">{short(prog.address, 8, 6)}</a></p>

      {err && <p className="banner bad" role="alert">{err}</p>}
      {!data && !err && <p className="lab-wait" role="status">Reading the program account from the chain…</p>}

      {data && stats && (
        <>
          <p className="pr-headline"><b>{grouped(data.bytes)} bytes</b> on chain are <b>{grouped(stats.code)} RISC-V instructions</b>. That is the whole program.</p>
          <div className="pr-mix" role="img" aria-label="Instruction mix">
            {KINDS.filter((k) => stats.by.get(k)).map((k) => <i key={k} className={`kc-${k}`} style={{ flexGrow: stats.by.get(k) }} title={`${KIND_LABEL[k]}: ${stats.by.get(k)}`} />)}
          </div>
          <ul className="pr-legend">{KINDS.filter((k) => stats.by.get(k)).map((k) => <li key={k}><i className={`kc-${k}`} />{KIND_LABEL[k]} <b>{stats.by.get(k)}</b></li>)}</ul>
          <ul className="pr-facts">
            <li><b>{stats.compressedPct}%</b> are 16-bit compressed instructions (cost 2 each instead of 4)</li>
            {stats.calls.length > 0 && <li>Syscalls it makes: {stats.calls.map(([n, c]) => `${n} ×${c}`).join(", ")}</li>}
            {stats.dataBytes > 0 && <li>{grouped(stats.dataBytes)} bytes after the code are data, not instructions</li>}
            <li>Format: 8-byte header (version {data.version}), bytecode, 8-byte zero trailer {data.trailerOk ? "✓" : "(trailer not zero)"}</li>
          </ul>

          <div className="pr-code" role="table" aria-label="Disassembly">
            <div className="hd" role="row"><span>offset</span>{dev && <span>bytes</span>}<span>instruction</span><span>cost</span></div>
            {data.insns.slice(0, rows).map((i) => (
              <div key={i.off} role="row" className={`row k-${i.kind}${i.syscall ? " sys" : ""}`}>
                <span className="off">{i.off.toString(16).padStart(4, "0")}</span>
                {dev && <span className="raw">{i.raw.toString(16).padStart(i.size * 2, "0")}</span>}
                <span className="ins"><b>{i.mnemonic}</b> {i.ops}{i.syscall && <em>  ← syscall: {i.syscall.name}</em>}</span>
                <span className="cu">{i.kind === "data" ? "" : i.cu}</span>
              </div>
            ))}
          </div>
          {rows < data.insns.length && <button type="button" className="btn ghost small" onClick={() => setRows((r) => r + 200)}>Show more ({grouped(data.insns.length - rows)} left)</button>}
        </>
      )}
    </div>
  );
}
