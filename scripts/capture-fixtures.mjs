// Records real Alphanet accounts and transactions into tests/fixtures so verifier tests run offline.
// Usage: NODE_EXTRA_CA_CERTS=... node scripts/capture-fixtures.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { createThruClient, AccountView } from "@thru/sdk";
import { encodeAddress, encodeSignature } from "@thru/sdk/helpers";

const thru = createThruClient({ baseUrl: "https://rpc.alphanet.thru.org" });
const hex = (u) => Buffer.from(u ?? []).toString("hex");
const addr = (k) => encodeAddress(k.bytes ?? k);

async function account(a) {
  const x = await thru.accounts.get(a, { view: AccountView.FULL });
  return { address: a, owner: addr(x.meta.owner), balance: x.meta.balance.toString(), dataHex: hex(x.data?.data) };
}
async function tx(sig) {
  const t = await thru.transactions.get(sig);
  const r = t.executionResult;
  return {
    signature: sig, slot: t.slot.toString(), program: addr(t.program), feePayer: addr(t.feePayer),
    readWrite: t.readWriteAccounts.map(addr), readOnly: t.readOnlyAccounts.map(addr),
    instructionHex: hex(t.instructionData), vmError: r.vmError, userErrorCode: r.userErrorCode.toString(), eventsCount: r.eventsCount,
  };
}

const out = {
  walletAccount: await account("takmSJFeHXH6_PBTftg342PFFWakw1gD0QVoQrBlxcjuUa"),
  emptyAccount: await account("taP_CdtUZRI9Gnbo2vpgupbgTIGjFK3BNkUBTFrFIMyl40"),
  tokenAccount: await account("tabrhH7Qem0lmrx8SYATaqL_mkFTK2zC5VOnhwKAkd1rf2"),
  mint: await account("taRfWjryqWSRRp6ZU_ahCHXKhEA0oRVKWZlE4Us86vnOOt"),
  nativeTransferOk: await tx("tsNzlKGti-CgbplUe3qyFZDamePdubJqLkiHd4KKiTdm4Te25hUe-qPNtDUq24szYpzMsplyMou_2Ig0DtuEHsBB5x"),
  nativeTransferFailed: await tx("tsImxPNzsNq4Q5DkhQ60PH-4A__V6z4E_AqfM-runoi10unz6siAwSeHNgEkPjk3bwKFwHtElK5zp89RMp0EjfAR3I"),
  tokenTransferFailed: await tx("tsIwXRy98yl0AiL7DNJR-gZxzUFpDfvxcVmIDwM2E_M7-u39LI8bt1G1p7KpcZRZgVx3eMP6uMWYqdQ6TLzMx-AB5-"),
};
mkdirSync("tests/fixtures", { recursive: true });
writeFileSync("tests/fixtures/alphanet.json", JSON.stringify(out, null, 2));
console.log("wrote tests/fixtures/alphanet.json", Object.keys(out).join(", "));
