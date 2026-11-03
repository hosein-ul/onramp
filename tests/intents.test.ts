import { describe, expect, it } from "vitest";
import { encodeTransferInstruction } from "@thru/programs/passkey-manager";
import { fromBase64, nativeTransferIntent, orderWritable, tokenTransferIntent, toBase64, transferInstruction } from "../src/wallet/intents";
import { parseTransferTail } from "../src/verify/parse";
import { FX } from "./fakeReader";

describe("orderWritable", () => {
  it("matches the order the wallet really produced on chain", () => {
    const ok = FX.nativeTransferOk; // readWrite on chain: [destination, wallet]
    const { sorted } = orderWritable([FX.walletAccount.address, ok.readWrite.find((a) => a !== FX.walletAccount.address) as string]);
    expect(sorted).toEqual(ok.readWrite);
  });
  it("orders the recorded token transfer's accounts like the chain did", () => {
    const f = FX.tokenTransferFailed;
    const { sorted } = orderWritable([...f.readWrite].reverse());
    expect(sorted).toEqual(f.readWrite);
  });
  it("throws for an address that was not listed", () => {
    expect(() => orderWritable(["tabrhH7Qem0lmrx8SYATaqL_mkFTK2zC5VOnhwKAkd1rf2"]).indexOf("taP_CdtUZRI9Gnbo2vpgupbgTIGjFK3BNkUBTFrFIMyl40")).toThrow();
  });
});

describe("transferInstruction", () => {
  it("is byte-identical to the SDK's native transfer encoder", () => {
    expect(Buffer.from(transferInstruction(3, 2, 777n))).toEqual(Buffer.from(encodeTransferInstruction({ walletAccountIdx: 3, toAccountIdx: 2, amount: 777n })));
  });
  it("round-trips base64", () => {
    const b = transferInstruction(2, 3, 10n);
    expect(Buffer.from(fromBase64(toBase64(b)))).toEqual(Buffer.from(b));
  });
});

describe("intents", () => {
  it("native: the wallet index points at the wallet in the sorted order", () => {
    const wallet = FX.walletAccount.address;
    const to = FX.nativeTransferOk.readWrite.find((a) => a !== wallet) as string;
    const i = nativeTransferIntent(wallet, to, 10n);
    const tail = parseTransferTail(fromBase64(i.instructionData))!;
    const order = orderWritable([wallet, to]).sorted;
    expect(order[tail.fromIdx - 2]).toBe(wallet);
    expect(order[tail.toIdx - 2]).toBe(to);
    expect(tail.amount).toBe(10n);
  });
  it("token: source and destination indices point at the right token accounts when the wallet is included", () => {
    const f = FX.tokenTransferFailed;
    const wallet = f.readWrite.find((a) => a.startsWith("taed6"))!;
    const src = f.readWrite.find((a) => a.startsWith("taP_"))!;
    const dst = f.readWrite.find((a) => a.startsWith("tabr"))!;
    const i = tokenTransferIntent(wallet, src, dst, 1000n, "Send");
    const tail = parseTransferTail(fromBase64(i.instructionData))!;
    const order = orderWritable([src, dst, wallet]).sorted;
    expect(order[tail.fromIdx - 2]).toBe(src);
    expect(order[tail.toIdx - 2]).toBe(dst);
    // The recorded transaction the wallet built from an equivalent intent ends with exactly these bytes.
    expect(Buffer.from(fromBase64(i.instructionData)).toString("hex")).toBe(f.instructionHex.slice(-26));
  });
});
