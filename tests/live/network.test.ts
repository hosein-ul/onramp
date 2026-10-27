// Opt-in: reads the real network. Run with `npm run test:live`.
import { describe, expect, it } from "vitest";
import { encodeAddress } from "@thru/sdk/helpers";
import { networkReader } from "../../src/verify/reader";
import { verifyFunds, verifyNativeTransfer, verifyWallet } from "../../src/verify/verifiers";
import { FX, tx } from "../fakeReader";

const WALLET = FX.walletAccount.address;
const reader = networkReader();

describe("networkReader against Alphanet", () => {
  it("reads the recorded wallet account", async () => {
    const a = await reader.getAccount(WALLET);
    expect(a?.owner).toBe(FX.walletAccount.owner);
  });
  it("returns null for an account that does not exist", async () => {
    const unused = encodeAddress(crypto.getRandomValues(new Uint8Array(32)));
    expect(await reader.getAccount(unused)).toBeNull();
  });
  it("lists the recorded transfer for the wallet, newest first, with identical fields", async () => {
    const txs = await reader.listTransactions(WALLET);
    const expected = tx(FX.nativeTransferOk);
    const got = txs.find((t) => t.signature === expected.signature);
    expect(got).toBeDefined();
    expect(got).toMatchObject({ slot: expected.slot, program: expected.program, vmError: 0, userErrorCode: 0n, readWrite: expected.readWrite });
    expect(Buffer.from(got!.instruction).toString("hex")).toBe(FX.nativeTransferOk.instructionHex);
    for (let i = 1; i < txs.length; i++) expect(txs[i - 1]!.slot >= txs[i]!.slot).toBe(true);
  });
  it("verifies missions 1, 2 and 3 for the recorded wallet end to end", async () => {
    expect((await verifyWallet(reader, WALLET)).kind).toBe("verified");
    expect((await verifyFunds(reader, WALLET)).kind).toBe("verified");
    expect((await verifyNativeTransfer(reader, WALLET)).kind).toBe("verified");
  });
});
