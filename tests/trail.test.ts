import { describe, expect, it } from "vitest";
import { MISSIONS_V1 } from "../missions/v1";
import { deriveStates, evaluate, type Outcome } from "../src/trail/trail";
import { ChainError, type ChainReader } from "../src/verify/types";
import { account, FX, fakeReader } from "./fakeReader";

const M = MISSIONS_V1.missions;
const ev = { summary: "x", address: "a", slot: 1n };
const verified: Outcome = { kind: "verified", evidence: ev };
const pending: Outcome = { kind: "pending", reason: "not yet" };

describe("deriveStates", () => {
  it("locks missions until their requirements are verified", () => {
    const s = deriveStates(M, { wallet: pending, funds: pending, transfer: pending, "token-account": pending, "token-transfer": pending });
    expect(s.wallet?.state).toBe("ready");
    expect(s.funds?.state).toBe("locked");
    expect(s["token-account"]?.state).toBe("locked");
  });
  it("opens the next mission once the previous one is verified", () => {
    const s = deriveStates(M, { wallet: verified, funds: pending, transfer: pending, "token-account": pending, "token-transfer": pending });
    expect(s.wallet?.state).toBe("verified");
    expect(s.funds?.state).toBe("ready");
    expect(s["token-account"]?.state).toBe("ready");
    expect(s.transfer?.state).toBe("locked");
  });
  it("shows checking before the chain has answered", () => {
    expect(deriveStates(M, {}).wallet?.state).toBe("checking");
  });
  it("keeps a network failure separate from 'not done'", () => {
    const s = deriveStates(M, { wallet: { kind: "error", message: "down" } });
    expect(s.wallet).toMatchObject({ state: "error", error: "down" });
    expect(s.wallet?.reason).toBeUndefined();
  });
  it("never marks anything verified without chain evidence", () => {
    const s = deriveStates(M, { wallet: pending, funds: pending });
    expect(Object.values(s).some((x) => x.state === "verified")).toBe(false);
  });
});

describe("evaluate", () => {
  const wallet = FX.walletAccount.address;
  const mission = (id: string) => M.find((m) => m.id === id)!;
  it("verifies from chain data", async () => {
    const o = await evaluate(mission("wallet"), fakeReader({ accounts: [account(FX.walletAccount)] }), { wallet });
    expect(o.kind).toBe("verified");
  });
  it("turns a network failure into an error, not a pending result", async () => {
    const broken: ChainReader = { ...fakeReader(), getAccount: async () => { throw new ChainError("Could not read the account from the network."); } };
    expect(await evaluate(mission("wallet"), broken, { wallet })).toEqual({ kind: "error", message: "Could not read the account from the network." });
  });
  it("is idempotent: repeating a verification gives the same result", async () => {
    const r = fakeReader({ accounts: [account(FX.walletAccount)] });
    expect(await evaluate(mission("funds"), r, { wallet })).toEqual(await evaluate(mission("funds"), r, { wallet }));
  });
});
