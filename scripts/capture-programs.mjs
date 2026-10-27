// Records the bytes of real deployed programs so the disassembler can be tested offline.
import { writeFileSync } from "node:fs";
import { createThruClient, AccountView } from "@thru/sdk";
import * as B from "@thru/programs/bootstrap-addresses";

const thru = createThruClient({ baseUrl: "https://rpc.alphanet.thru.org" });
const out = {};
for (const name of ["noop", "multicall", "eoa", "compression", "oracle", "uploader", "faucet"]) {
  const a = B.BOOTSTRAP_PROGRAM_ADDRESSES[name];
  const acc = await thru.accounts.get(a, { view: AccountView.FULL });
  out[name] = { address: a, hex: Buffer.from(acc.data.data).toString("hex") };
}
writeFileSync("tests/fixtures/programs.json", JSON.stringify(out, null, 2));
console.log(Object.entries(out).map(([k, v]) => `${k}:${v.hex.length / 2}B`).join("  "));
