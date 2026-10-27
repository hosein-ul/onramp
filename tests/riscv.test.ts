import { describe, expect, it } from "vitest";
import programs from "./fixtures/programs.json";
import gt from "./fixtures/programs.gt.json";
import { disassemble, num, splitExecutable } from "../src/labs/riscv";

/** The reference prints branch and jump offsets relative to the instruction; Waypoint prints the absolute target. */
const JUMPS = /^(c\.)?(beq|bne|blt|bge|bltu|bgeu|beqz|bnez|bltz|bgez|blez|bgtz|j|jal)$/;
function absolute(off: number, m: string, ops: string): string {
  if (!JUMPS.test(m)) return ops;
  const parts = ops.split(", ");
  const last = parts[parts.length - 1] as string;
  const rel = last.startsWith("-") ? -Number(last.slice(1)) : Number(last);
  parts[parts.length - 1] = num(off + rel);
  return parts.join(", ");
}

const unhex = (h: string) => new Uint8Array(h.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);

describe("disassembler matches a reference disassembler on real Thru programs", () => {
  for (const [name, p] of Object.entries(programs)) {
    it(name, () => {
      const exe = splitExecutable(unhex(p.hex))!;
      expect(exe.version).toBe(1);
      expect(exe.trailerOk).toBe(true);
      const mine = disassemble(exe.code);
      const ref = (gt as Record<string, [number, number, string, string][]>)[name]!;
      // Where both streams have an instruction at the same offset they must agree exactly. The reference keeps decoding
      // data bytes as code, so the two streams can drift apart inside data regions; those offsets are skipped and counted.
      const diffs: string[] = [];
      let compared = 0, skipped = 0;
      for (const [off, size, m, ops] of ref) {
        // ThruVM implements I, M, C, B and Zknh. Floating point and CSR forms can only be data that the reference misreads as code.
        if (m.startsWith(".") || m === "c.unimp" || /^(c\.)?f/.test(m) || m.startsWith("csr")) { skipped++; continue; }
        const mi = mine.find((x) => x.off === off);
        if (!mi) { skipped++; continue; }
        compared++;
        const want = absolute(off, m, ops);
        if (mi.size !== size || mi.mnemonic !== m || mi.ops !== want) diffs.push(`@${off.toString(16)} ref=[${m} ${want}] mine=[${mi.mnemonic} ${mi.ops}]`);
      }
      expect(diffs.slice(0, 12), `${diffs.length} of ${compared} differ`).toEqual([]);
      expect(compared / ref.length).toBeGreaterThan(0.85);
      console.log(`${name}: ${compared} instructions identical to the reference (${skipped} skipped as data)`);
    });
  }
});
