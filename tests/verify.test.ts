import { describe, expect, it } from "vitest";
import { createTransferInstruction } from "@thru/programs/token";
import { encodeTransferInstruction } from "@thru/programs/passkey-manager";
import { parseTransferTail } from "../src/verify/parse";
import { PROGRAMS } from "../src/verify/programs";
import { verifyFunds, verifyNativeTransfer, verifyTokenAccount, verifyTokenTransfer, verifyWallet } from "../src/verify/verifiers";
import { account, FX, fakeReader, tx } from "./fakeReader";

const WALLET = FX.walletAccount.address;
const TOKEN_OWNER = "taK93SH-iE49dNku3vCO-xQBYqxIp30-2my_wJjR_UshlI"; // owner of the recorded token account
const tokenAcct = account(FX.tokenAccount);
const mint = account(FX.mint);

describe("parseTransferTail", () => {
  it("reads the same layout for native and token transfers", async () => {
    const native = encodeTransferInstruction({ walletAccountIdx: 2, toAccountIdx: 3, amount: 1234567n });
    const idx = new Map([[1, 2], [2, 3]]);
    const token = await createTransferInstruction({ sourceAccountBytes: new Uint8Array(32).fill(1), destinationAccountBytes: new Uint8Array(32).fill(2), amount: 1234567n })({ getAccountIndex: (b: Uint8Array) => idx.get(b[0] as number) } as never);
    expect(parseTransferTail(native)).toEqual({ fromIdx: 2, toIdx: 3, amount: 1234567n });
    expect(parseTransferTail(new Uint8Array(token))).toEqual({ fromIdx: 2, toIdx: 3, amount: 1234567n });
  });
  it("rejects data that is not a transfer", () => {
    expect(parseTransferTail(new Uint8Array(5))).toBeNull();
    expect(parseTransferTail(new Uint8Array(13).fill(9))).toBeNull();
  });
});

describe("verifyWallet (mission 1)", () => {
  it("verifies a real Passkey Manager wallet", async () => {
    const r = await verifyWallet(fakeReader({ accounts: [account(FX.walletAccount)] }), WALLET);
    expect(r.kind).toBe("verified");
  });
  it("is pending for an address with no account", async () => {
    const r = await verifyWallet(fakeReader(), WALLET);
    expect(r).toMatchObject({ kind: "pending" });
  });
  it("rejects an account owned by another program", async () => {
    const r = await verifyWallet(fakeReader({ accounts: [tokenAcct] }), tokenAcct.address);
    expect(r).toMatchObject({ kind: "pending", reason: expect.stringContaining("not a Passkey Manager") });
  });
  it("rejects text that is not an address", async () => {
    expect(await verifyWallet(fakeReader(), "hello")).toMatchObject({ kind: "pending" });
  });
});

describe("verifyFunds (mission 2)", () => {
  it("verifies a positive balance", async () => {
    const r = await verifyFunds(fakeReader({ accounts: [account(FX.walletAccount)] }), WALLET);
    expect(r.kind).toBe("verified");
  });
  it("is pending when the balance is zero", async () => {
    const zero = { ...account(FX.walletAccount), balance: 0n };
    expect(await verifyFunds(fakeReader({ accounts: [zero] }), WALLET)).toMatchObject({ kind: "pending" });
  });
});

describe("verifyNativeTransfer (mission 3)", () => {
  const ok = tx(FX.nativeTransferOk);
  // The recorded transfer: wallet takmSJ… sent 100 to the CLI test account.
  const to = ok.readWrite.find((a) => a !== WALLET) as string;
  it("verifies a real successful transfer and returns its signature and slot", async () => {
    const r = await verifyNativeTransfer(fakeReader({ txs: [ok] }), WALLET);
    expect(r).toMatchObject({ kind: "verified", evidence: { signature: ok.signature, slot: ok.slot } });
  });
  it("honours a required target", async () => {
    expect((await verifyNativeTransfer(fakeReader({ txs: [ok] }), WALLET, { target: to })).kind).toBe("verified");
    expect((await verifyNativeTransfer(fakeReader({ txs: [ok] }), WALLET, { target: PROGRAMS.token })).kind).toBe("pending");
  });
  it("does not count a transaction that landed but failed", async () => {
    const r = await verifyNativeTransfer(fakeReader({ txs: [tx(FX.nativeTransferFailed)] }), WALLET);
    expect(r).toMatchObject({ kind: "pending", reason: expect.stringContaining("rejected") });
  });
  it("does not count someone else's transfer", async () => {
    const r = await verifyNativeTransfer(fakeReader({ txs: [ok] }), "taP_CdtUZRI9Gnbo2vpgupbgTIGjFK3BNkUBTFrFIMyl40");
    expect(r.kind).toBe("pending");
  });
  it("does not count a token transfer as a native transfer", async () => {
    const t = tx(FX.tokenTransferFailed);
    const success = { ...t, vmError: 0, userErrorCode: 0n };
    expect((await verifyNativeTransfer(fakeReader({ txs: [success] }), WALLET)).kind).toBe("pending");
  });
  it("is pending with no transactions", async () => {
    expect((await verifyNativeTransfer(fakeReader(), WALLET)).kind).toBe("pending");
  });
});

describe("verifyTokenAccount (mission 4)", () => {
  const exp = { tokenAccount: tokenAcct.address, mint: mint.address };
  const reader = fakeReader({ accounts: [tokenAcct, mint] });
  it("verifies a THRUSD token account owned by the wallet", async () => {
    expect((await verifyTokenAccount(reader, TOKEN_OWNER, exp)).kind).toBe("verified");
  });
  it("rejects a different wallet", async () => {
    expect(await verifyTokenAccount(reader, WALLET, exp)).toMatchObject({ kind: "pending", reason: expect.stringContaining("different wallet") });
  });
  it("rejects a mint the wallet reported wrongly", async () => {
    expect(await verifyTokenAccount(reader, TOKEN_OWNER, { ...exp, mint: PROGRAMS.token })).toMatchObject({ kind: "pending" });
  });
  it("rejects a token that is not THRUSD on chain", async () => {
    expect(await verifyTokenAccount(reader, TOKEN_OWNER, { ...exp, ticker: "OTHER" })).toMatchObject({ kind: "pending", reason: expect.stringContaining("THRUSD") });
  });
  it("is pending when the account does not exist", async () => {
    expect((await verifyTokenAccount(fakeReader(), TOKEN_OWNER, exp)).kind).toBe("pending");
  });
});

describe("verifyTokenTransfer (mission 5)", () => {
  const failed = tx(FX.tokenTransferFailed);
  const source = account(FX.emptyAccount).address; // the recorded failed transfer was sent from this token account
  it("does not count a failed token transfer", async () => {
    const r = await verifyTokenTransfer(fakeReader({ txs: [failed] }), source);
    expect(r).toMatchObject({ kind: "pending", reason: expect.stringContaining("rejected") });
  });
  it("counts the same transaction once it succeeds", async () => {
    const success = { ...failed, vmError: 0, userErrorCode: 0n, eventsCount: 2 };
    expect(await verifyTokenTransfer(fakeReader({ txs: [success] }), source)).toMatchObject({ kind: "verified", evidence: { signature: failed.signature } });
  });
  it("ignores a transfer from a different token account", async () => {
    const success = { ...failed, vmError: 0, userErrorCode: 0n };
    expect((await verifyTokenTransfer(fakeReader({ txs: [success] }), tokenAcct.address)).kind).toBe("pending");
  });
});
