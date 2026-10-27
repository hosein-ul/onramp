/**
 * A small RV64 disassembler (I, M, C and the common B / Zknh forms) for reading real Thru programs in the browser.
 * Output follows the conventions of common disassemblers (ABI register names, small numbers in decimal, larger in hex).
 */
export type InsnKind = "alu" | "mem" | "branch" | "jump" | "syscall" | "mul" | "bit" | "hash" | "other" | "data";

export interface Insn {
  /** Offset in the program bytecode, after the 8-byte header. */
  off: number;
  size: 2 | 4;
  raw: number;
  mnemonic: string;
  ops: string;
  kind: InsnKind;
  /** Instruction-fetch cost per the Thru resource spec: 4 for a 32-bit instruction, 2 for a compressed one. */
  cu: number;
  /** For `ecall`: the syscall selected by the last value loaded into a7, when it can be seen. */
  syscall?: { code: number; name: string };
}

export const SYSCALLS: Record<number, string> = {
  0x00: "set_anonymous_segment_sz", 0x01: "increment_anonymous_segment_sz", 0x02: "set_account_data_writable", 0x03: "account_transfer",
  0x04: "account_create", 0x05: "account_create_ephemeral", 0x06: "account_delete", 0x07: "account_resize", 0x08: "account_compress",
  0x09: "account_decompress", 0x0a: "invoke", 0x0b: "exit", 0x0c: "log", 0x0d: "emit_event", 0x0e: "account_set_flags", 0x0f: "account_create_eoa",
};

const R = ["zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2", "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"];
const rc = (n: number) => R[8 + n] as string;

/** Small values print in decimal, anything above 9 in hex, with the sign in front. */
export function num(v: number | bigint): string {
  const n = BigInt(v);
  const a = n < 0n ? -n : n;
  const s = a > 9n ? `0x${a.toString(16)}` : a.toString();
  return n < 0n ? `-${s}` : s;
}

const bits = (x: number, hi: number, lo: number) => (x >>> lo) & ((1 << (hi - lo + 1)) - 1);
const sext = (x: number, w: number) => (x << (32 - w)) >> (32 - w);

function kindOf(m: string): InsnKind {
  if (/^(c\.)?(l[bhwd]u?|s[bhwd]|ldsp|lwsp|sdsp|swsp|lw|ld|sw|sd)/.test(m) && !/^(slt|sll|sra|srl|sub|sext)/.test(m)) return "mem";
  if (/^(c\.)?(beq|bne|blt|bge|bgt|ble)/.test(m) || /^c\.(beqz|bnez)/.test(m)) return "branch";
  if (/^(c\.)?(jal|jalr|jr|j|ret)$/.test(m)) return "jump";
  if (/^(mul|div|rem)/.test(m)) return "mul";
  if (/^sha(256|512)/.test(m)) return "hash";
  if (/^(clz|ctz|cpop|rev8|rol|ror|andn|orn|xnor|min|max|sh[123]add|zext|sext\.[bh]|bset|bclr|binv|bext|orc)/.test(m)) return "bit";
  if (m === "ecall") return "syscall";
  if (m === ".word" || m === ".half") return "data";
  return "alu";
}

function d32(w: number, off: number): { m: string; ops: string } {
  const op = w & 0x7f, rd = bits(w, 11, 7), f3 = bits(w, 14, 12), rs1 = bits(w, 19, 15), rs2 = bits(w, 24, 20), f7 = bits(w, 31, 25);
  const iimm = sext(w >>> 20, 12);
  const simm = sext((bits(w, 31, 25) << 5) | bits(w, 11, 7), 12);
  const bimm = sext((bits(w, 31, 31) << 12) | (bits(w, 7, 7) << 11) | (bits(w, 30, 25) << 5) | (bits(w, 11, 8) << 1), 13);
  const jimm = sext((bits(w, 31, 31) << 20) | (bits(w, 19, 12) << 12) | (bits(w, 20, 20) << 11) | (bits(w, 30, 21) << 1), 21);
  const rr = (m: string) => ({ m, ops: `${R[rd]}, ${R[rs1]}, ${R[rs2]}` });
  const ri = (m: string, imm: number) => ({ m, ops: `${R[rd]}, ${R[rs1]}, ${num(imm)}` });
  switch (op) {
    case 0x37: return { m: "lui", ops: `${R[rd]}, ${num(w >>> 12)}` };
    case 0x17: return { m: "auipc", ops: `${R[rd]}, ${num(w >>> 12)}` };
    case 0x6f: return rd === 0 ? { m: "j", ops: num(off + jimm) } : rd === 1 ? { m: "jal", ops: num(off + jimm) } : { m: "jal", ops: `${R[rd]}, ${num(off + jimm)}` };
    case 0x67: {
      if (rd === 0 && iimm === 0) return rs1 === 1 ? { m: "ret", ops: "" } : { m: "jr", ops: R[rs1] as string };
      return { m: "jalr", ops: iimm === 0 && rd === 1 ? (R[rs1] as string) : `${R[rd]}, ${num(iimm)}(${R[rs1]})` };
    }
    case 0x63: {
      const t = num(off + bimm);
      const names = ["beq", "bne", "", "", "blt", "bge", "bltu", "bgeu"];
      const base = names[f3];
      if (!base) break;
      if (rs2 === 0 && f3 === 0) return { m: "beqz", ops: `${R[rs1]}, ${t}` };
      if (rs2 === 0 && f3 === 1) return { m: "bnez", ops: `${R[rs1]}, ${t}` };
      if (rs2 === 0 && f3 === 4) return { m: "bltz", ops: `${R[rs1]}, ${t}` };
      if (rs2 === 0 && f3 === 5) return { m: "bgez", ops: `${R[rs1]}, ${t}` };
      if (rs1 === 0 && f3 === 5) return { m: "blez", ops: `${R[rs2]}, ${t}` };
      if (rs1 === 0 && f3 === 4) return { m: "bgtz", ops: `${R[rs2]}, ${t}` };
      return { m: base, ops: `${R[rs1]}, ${R[rs2]}, ${t}` };
    }
    case 0x03: { const n = ["lb", "lh", "lw", "ld", "lbu", "lhu", "lwu"][f3]; if (n) return { m: n, ops: `${R[rd]}, ${num(iimm)}(${R[rs1]})` }; break; }
    case 0x23: { const n = ["sb", "sh", "sw", "sd"][f3]; if (n) return { m: n, ops: `${R[rs2]}, ${num(simm)}(${R[rs1]})` }; break; }
    case 0x13: {
      const sh = bits(w, 25, 20);
      if (f3 === 0) return iimm === 0 && rs1 === 0 && rd === 0 ? { m: "nop", ops: "" } : iimm === 0 ? { m: "mv", ops: `${R[rd]}, ${R[rs1]}` } : ri("addi", iimm);
      if (f3 === 1) {
        if (bits(w, 31, 20) === 0x600) return { m: "clz", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x601) return { m: "ctz", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x602) return { m: "cpop", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x604) return { m: "sext.b", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x605) return { m: "sext.h", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x108) return { m: "sha256sum0", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x109) return { m: "sha256sum1", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x10a) return { m: "sha256sig0", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x10b) return { m: "sha256sig1", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x104) return { m: "sha512sum0", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x105) return { m: "sha512sum1", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x106) return { m: "sha512sig0", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x107) return { m: "sha512sig1", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 26) === 0) return ri("slli", sh);
        if (bits(w, 31, 26) === 0x0a) return ri("bseti", sh);
        if (bits(w, 31, 26) === 0x12) return ri("bclri", sh);
        if (bits(w, 31, 26) === 0x1a) return ri("binvi", sh);
        break;
      }
      if (f3 === 2) return ri("slti", iimm);
      if (f3 === 3) return ri("sltiu", iimm);
      if (f3 === 4) return iimm === -1 ? { m: "not", ops: `${R[rd]}, ${R[rs1]}` } : ri("xori", iimm);
      if (f3 === 5) {
        if (bits(w, 31, 20) === 0x6b8) return { m: "rev8", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 20) === 0x287) return { m: "orc.b", ops: `${R[rd]}, ${R[rs1]}` };
        if (bits(w, 31, 26) === 0) return ri("srli", sh);
        if (bits(w, 31, 26) === 0x10) return ri("srai", sh);
        if (bits(w, 31, 26) === 0x18) return ri("rori", sh);
        if (bits(w, 31, 26) === 0x12) return ri("bexti", sh);
        break;
      }
      if (f3 === 6) return ri("ori", iimm);
      return ri("andi", iimm);
    }
    case 0x1b: {
      const sh = bits(w, 24, 20);
      if (f3 === 0) return iimm === 0 ? { m: "sext.w", ops: `${R[rd]}, ${R[rs1]}` } : ri("addiw", iimm);
      if (f3 === 1 && f7 === 0) return ri("slliw", sh);
      if (f3 === 5 && f7 === 0) return ri("srliw", sh);
      if (f3 === 5 && f7 === 0x20) return ri("sraiw", sh);
      if (f3 === 5 && f7 === 0x30) return ri("roriw", sh);
      if (f3 === 1 && bits(w, 31, 20) === 0x600) return { m: "clzw", ops: `${R[rd]}, ${R[rs1]}` };
      break;
    }
    case 0x33: {
      if (f7 === 1) { const n = ["mul", "mulh", "mulhsu", "mulhu", "div", "divu", "rem", "remu"][f3]; if (n) return rr(n); }
      if (f7 === 0) { const n = ["add", "sll", "slt", "sltu", "xor", "srl", "or", "and"][f3]; if (n) return n === "sltu" && rs1 === 0 ? { m: "snez", ops: `${R[rd]}, ${R[rs2]}` } : rr(n); }
      if (f7 === 0x20) { const n = { 0: "sub", 4: "xnor", 5: "sra", 6: "orn", 7: "andn" }[f3 as 0 | 4 | 5 | 6 | 7]; if (n) return n === "sub" && rs1 === 0 ? { m: "neg", ops: `${R[rd]}, ${R[rs2]}` } : rr(n); }
      if (f7 === 5) { const n = { 4: "min", 5: "minu", 6: "max", 7: "maxu" }[f3 as 4 | 5 | 6 | 7]; if (n) return rr(n); }
      if (f7 === 0x10) { const n = { 2: "sh1add", 4: "sh2add", 6: "sh3add" }[f3 as 2 | 4 | 6]; if (n) return rr(n); }
      if (f7 === 0x30) { const n = { 1: "rol", 5: "ror" }[f3 as 1 | 5]; if (n) return rr(n); }
      break;
    }
    case 0x3b: {
      if (f7 === 1) { const n = { 0: "mulw", 4: "divw", 5: "divuw", 6: "remw", 7: "remuw" }[f3 as 0 | 4 | 5 | 6 | 7]; if (n) return rr(n); }
      if (f7 === 0) { const n = { 0: "addw", 1: "sllw", 5: "srlw" }[f3 as 0 | 1 | 5]; if (n) return rr(n); }
      if (f7 === 0x20) { const n = { 0: "subw", 5: "sraw" }[f3 as 0 | 5]; if (n) return rr(n); }
      if (f7 === 4 && f3 === 0) return rr("add.uw");
      if (f7 === 0x30) { const n = { 1: "rolw", 5: "rorw" }[f3 as 1 | 5]; if (n) return rr(n); }
      break;
    }
    case 0x0f: return { m: "fence", ops: "" };
    case 0x73: {
      if (w === 0x00000073) return { m: "ecall", ops: "" };
      if (w === 0x00100073) return { m: "ebreak", ops: "" };
      break;
    }
  }
  return { m: ".word", ops: `0x${(w >>> 0).toString(16).padStart(8, "0")}` };
}

function d16(h: number, off: number): { m: string; ops: string } {
  const q = h & 3, f3 = bits(h, 15, 13);
  const rdp = bits(h, 4, 2), rs1p = bits(h, 9, 7);
  const rd = bits(h, 11, 7), rs2 = bits(h, 6, 2);
  if (q === 0) {
    if (h === 0) return { m: "c.unimp", ops: "" };
    if (f3 === 0) { const imm = (bits(h, 10, 7) << 6) | (bits(h, 12, 11) << 4) | (bits(h, 5, 5) << 3) | (bits(h, 6, 6) << 2); return { m: "c.addi4spn", ops: `${rc(rdp)}, sp, ${num(imm)}` }; }
    if (f3 === 2) { const imm = (bits(h, 5, 5) << 6) | (bits(h, 12, 10) << 3) | (bits(h, 6, 6) << 2); return { m: "c.lw", ops: `${rc(rdp)}, ${num(imm)}(${rc(rs1p)})` }; }
    if (f3 === 3) { const imm = (bits(h, 6, 5) << 6) | (bits(h, 12, 10) << 3); return { m: "c.ld", ops: `${rc(rdp)}, ${num(imm)}(${rc(rs1p)})` }; }
    if (f3 === 6) { const imm = (bits(h, 5, 5) << 6) | (bits(h, 12, 10) << 3) | (bits(h, 6, 6) << 2); return { m: "c.sw", ops: `${rc(rdp)}, ${num(imm)}(${rc(rs1p)})` }; }
    if (f3 === 7) { const imm = (bits(h, 6, 5) << 6) | (bits(h, 12, 10) << 3); return { m: "c.sd", ops: `${rc(rdp)}, ${num(imm)}(${rc(rs1p)})` }; }
  } else if (q === 1) {
    const imm6 = sext((bits(h, 12, 12) << 5) | bits(h, 6, 2), 6);
    if (f3 === 0) return rd === 0 && imm6 === 0 ? { m: "c.nop", ops: "" } : { m: "c.addi", ops: `${R[rd]}, ${num(imm6)}` };
    if (f3 === 1) return { m: "c.addiw", ops: `${R[rd]}, ${num(imm6)}` };
    if (f3 === 2) return { m: "c.li", ops: `${R[rd]}, ${num(imm6)}` };
    if (f3 === 3) {
      if (rd === 2) { const imm = sext((bits(h, 12, 12) << 9) | (bits(h, 4, 3) << 7) | (bits(h, 5, 5) << 6) | (bits(h, 2, 2) << 5) | (bits(h, 6, 6) << 4), 10); return { m: "c.addi16sp", ops: `sp, ${num(imm)}` }; }
      return { m: "c.lui", ops: `${R[rd]}, ${num(imm6 & 0xfffff)}` };
    }
    if (f3 === 4) {
      const sh = (bits(h, 12, 12) << 5) | bits(h, 6, 2), s = bits(h, 11, 10);
      if (s === 0) return { m: "c.srli", ops: `${rc(rs1p)}, ${num(sh)}` };
      if (s === 1) return { m: "c.srai", ops: `${rc(rs1p)}, ${num(sh)}` };
      if (s === 2) return { m: "c.andi", ops: `${rc(rs1p)}, ${num(imm6)}` };
      const n = bits(h, 12, 12) === 0 ? ["c.sub", "c.xor", "c.or", "c.and"][bits(h, 6, 5)] : ["c.subw", "c.addw"][bits(h, 6, 5)];
      if (n) return { m: n, ops: `${rc(rs1p)}, ${rc(rdp)}` };
    }
    if (f3 === 5) { const imm = sext((bits(h, 12, 12) << 11) | (bits(h, 8, 8) << 10) | (bits(h, 10, 9) << 8) | (bits(h, 6, 6) << 7) | (bits(h, 7, 7) << 6) | (bits(h, 2, 2) << 5) | (bits(h, 11, 11) << 4) | (bits(h, 5, 3) << 1), 12); return { m: "c.j", ops: num(off + imm) }; }
    if (f3 === 6 || f3 === 7) {
      const imm = sext((bits(h, 12, 12) << 8) | (bits(h, 6, 5) << 6) | (bits(h, 2, 2) << 5) | (bits(h, 11, 10) << 3) | (bits(h, 4, 3) << 1), 9);
      return { m: f3 === 6 ? "c.beqz" : "c.bnez", ops: `${rc(rs1p)}, ${num(off + imm)}` };
    }
  } else if (q === 2) {
    if (f3 === 0) return { m: "c.slli", ops: `${R[rd]}, ${num((bits(h, 12, 12) << 5) | bits(h, 6, 2))}` };
    if (f3 === 2) { const imm = (bits(h, 3, 2) << 6) | (bits(h, 12, 12) << 5) | (bits(h, 6, 4) << 2); return { m: "c.lwsp", ops: `${R[rd]}, ${num(imm)}(sp)` }; }
    if (f3 === 3) { const imm = (bits(h, 4, 2) << 6) | (bits(h, 12, 12) << 5) | (bits(h, 6, 5) << 3); return { m: "c.ldsp", ops: `${R[rd]}, ${num(imm)}(sp)` }; }
    if (f3 === 4) {
      if (bits(h, 12, 12) === 0) return rs2 === 0 ? { m: "c.jr", ops: R[rd] as string } : { m: "c.mv", ops: `${R[rd]}, ${R[rs2]}` };
      if (rd === 0 && rs2 === 0) return { m: "c.ebreak", ops: "" };
      return rs2 === 0 ? { m: "c.jalr", ops: R[rd] as string } : { m: "c.add", ops: `${R[rd]}, ${R[rs2]}` };
    }
    if (f3 === 6) { const imm = (bits(h, 8, 7) << 6) | (bits(h, 12, 9) << 2); return { m: "c.swsp", ops: `${R[rs2]}, ${num(imm)}(sp)` }; }
    if (f3 === 7) { const imm = (bits(h, 9, 7) << 6) | (bits(h, 12, 10) << 3); return { m: "c.sdsp", ops: `${R[rs2]}, ${num(imm)}(sp)` }; }
  }
  return { m: ".half", ops: `0x${h.toString(16).padStart(4, "0")}` };
}

/** Splits a Thru executable into its header, bytecode and zero trailer. Returns null when it is not one. */
export function splitExecutable(data: Uint8Array): { version: number; code: Uint8Array; trailerOk: boolean } | null {
  if (data.length < 16 || data[0] !== 1) return null;
  const trailer = data.subarray(data.length - 8);
  return { version: data[0], code: data.subarray(8, data.length - 8), trailerOk: trailer.every((b) => b === 0) };
}

export function disassemble(code: Uint8Array): Insn[] {
  const out: Insn[] = [];
  const v = new DataView(code.buffer, code.byteOffset, code.byteLength);
  let a7: number | undefined;
  for (let off = 0; off < code.length; ) {
    const lo = off + 2 <= code.length ? v.getUint16(off, true) : 0;
    const is32 = (lo & 3) === 3 && off + 4 <= code.length;
    const size: 2 | 4 = is32 ? 4 : 2;
    const raw = is32 ? v.getUint32(off, true) : lo;
    const d = is32 ? d32(raw, off) : d16(raw, off);
    const insn: Insn = { off, size, raw, mnemonic: d.m, ops: d.ops, kind: kindOf(d.m), cu: size === 4 ? 4 : 2 };
    // Track "load a7" so each ecall can be named. a7 holds the syscall number.
    if ((d.m === "c.li" || d.m === "addi") && /^a7(,|$)/.test(d.ops)) {
      const parts = d.ops.split(", ");
      const imm = parts[parts.length - 1] as string;
      if (d.m === "c.li" || parts[1] === "zero") a7 = Number(imm.startsWith("-") ? NaN : imm);
    } else if (/^(c\.)?(mv|lw|ld|lbu|lhu|add|or|slli|lui)/.test(d.m) && /^a7,/.test(d.ops)) a7 = undefined;
    if (d.m === "ecall" && a7 !== undefined && SYSCALLS[a7]) insn.syscall = { code: a7, name: SYSCALLS[a7] as string };
    out.push(insn);
    off += size;
  }
  return out;
}
