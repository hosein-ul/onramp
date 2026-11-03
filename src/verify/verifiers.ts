import { TokenAccount, parseMintAccountData } from "@thru/programs/token";
import { parseWalletAuthorities } from "@thru/programs/passkey-manager";
import { decodeAddress, encodeAddress } from "@thru/sdk/helpers";
import { accountAt, parseTransferTail } from "./parse";
import { PROGRAMS } from "./programs";
import { isOk, type ChainAccount, type ChainReader, type ChainTx, type Evidence, type VerifyResult } from "./types";

const pending = (reason: string): VerifyResult => ({ kind: "pending", reason });

async function evidenceFor(reader: ChainReader, base: Omit<Evidence, "timeMs">): Promise<Evidence> {
  return { ...base, timeMs: await reader.blockTimeMs(base.slot) };
}

export function isValidAddress(address: string): boolean {
  try {
    return decodeAddress(address).length === 32;
  } catch {
    return false;
  }
}

/** Mission 1. The address is a wallet account owned by the Passkey Manager program with at least one authority. */
export async function verifyWallet(reader: ChainReader, address: string): Promise<VerifyResult> {
  if (!isValidAddress(address)) return pending("That is not a valid Thru address.");
  const account = await reader.getAccount(address);
  if (!account) return pending("This address has no account on the network yet.");
  if (account.owner !== PROGRAMS.passkeyManager) return pending("This account is not a Passkey Manager wallet.");
  let authorities = 0;
  try {
    authorities = parseWalletAuthorities(account.data).authorities.length;
  } catch {
    return pending("The wallet account data could not be read.");
  }
  if (authorities < 1) return pending("The wallet has no passkey registered.");

  const txs = await reader.listTransactions(address);
  const creation = [...txs].reverse().find(isOk);
  const slot = creation?.slot ?? (await reader.height());
  return {
    kind: "verified",
    evidence: await evidenceFor(reader, {
      summary: `Passkey wallet with ${authorities} registered passkey${authorities === 1 ? "" : "s"}.`,
      address,
      signature: creation?.signature,
      slot,
      readAtSlot: !creation,
    }),
  };
}

/** Mission 2. The wallet account holds a native balance above zero. */
export async function verifyFunds(reader: ChainReader, address: string): Promise<VerifyResult> {
  const account = await reader.getAccount(address);
  if (!account) return pending("This address has no account on the network yet.");
  if (account.balance <= 0n) return pending("The balance is still zero. Request test funds, then verify again.");
  const txs = await reader.listTransactions(address);
  const funding = txs.find((t) => isOk(t) && (t.program === PROGRAMS.faucet || t.program === PROGRAMS.eoa) && t.readWrite.includes(address));
  const slot = funding?.slot ?? (await reader.height());
  return {
    kind: "verified",
    evidence: await evidenceFor(reader, {
      summary: `Balance is ${account.balance.toString()} on the network.`,
      address,
      signature: funding?.signature,
      slot,
      readAtSlot: !funding,
    }),
  };
}

export interface NativeTransferOptions {
  /** When set, the transfer must go to exactly this address. */
  target?: string;
}

/** Mission 3. A successful Passkey Manager transaction moved native balance out of this wallet. */
export async function verifyNativeTransfer(reader: ChainReader, wallet: string, opts: NativeTransferOptions = {}): Promise<VerifyResult> {
  const txs = await reader.listTransactions(wallet);
  for (const tx of txs) {
    const t = matchWalletTransfer(tx, wallet);
    if (!t || tx.readOnly.includes(PROGRAMS.token)) continue; // token transfers carry the Token program
    if (t.to === wallet) continue;
    if (opts.target && t.to !== opts.target) continue;
    return {
      kind: "verified",
      evidence: await evidenceFor(reader, {
        summary: `Sent ${t.amount.toString()} to ${t.to}.`,
        address: wallet,
        signature: tx.signature,
        slot: tx.slot,
      }),
    };
  }
  const where = opts.target ? " to the target address" : "";
  const failed = txs.some((tx) => !isOk(tx) && tx.program === PROGRAMS.passkeyManager && parseTransferTail(tx.instruction));
  return pending(failed ? `A transfer was submitted but the network rejected it. Check your balance and try again.` : `No confirmed transfer${where} found for this wallet yet.`);
}

/** The account the user's Passkey Manager transaction sent from and to, when it is a successful transfer. */
function matchWalletTransfer(tx: ChainTx, from: string): { to: string; amount: bigint } | null {
  if (tx.program !== PROGRAMS.passkeyManager || !isOk(tx)) return null;
  const tail = parseTransferTail(tx.instruction);
  if (!tail || tail.amount <= 0n) return null;
  if (accountAt(tx, tail.fromIdx) !== from) return null;
  const to = accountAt(tx, tail.toIdx);
  return to ? { to, amount: tail.amount } : null;
}

export interface TokenAccountExpectation {
  /** The token account address the wallet prepared for the user. */
  tokenAccount: string;
  /** Mint the wallet reported. When omitted, the mint stored in the token account is used. Either way the chain must say it is THRUSD. */
  mint?: string;
  ticker?: string;
}

function readTokenAccount(account: ChainAccount): { mint: string; owner: string; amount: bigint } | null {
  const parsed = TokenAccount.from_array(account.data);
  if (!parsed) return null;
  return {
    mint: encodeAddress(new Uint8Array(parsed.mint.get_bytes())),
    owner: encodeAddress(new Uint8Array(parsed.owner.get_bytes())),
    amount: parsed.amount,
  };
}

/** Mission 4. A Token-program account exists, belongs to this wallet, and holds the THRUSD mint (checked on chain). */
export async function verifyTokenAccount(reader: ChainReader, wallet: string, exp: TokenAccountExpectation): Promise<VerifyResult> {
  const ticker = exp.ticker ?? "THRUSD";
  const account = await reader.getAccount(exp.tokenAccount);
  if (!account) return pending("The token account does not exist yet.");
  if (account.owner !== PROGRAMS.token) return pending("That address is not a Token program account.");
  const parsed = readTokenAccount(account);
  if (!parsed) return pending("The token account data could not be read.");
  if (parsed.owner !== wallet) return pending("That token account belongs to a different wallet.");
  if (exp.mint && parsed.mint !== exp.mint) return pending("That token account holds a different token than the wallet reported.");

  const mintAccount = await reader.getAccount(parsed.mint);
  if (!mintAccount || mintAccount.owner !== PROGRAMS.token) return pending("The token mint was not found on the network.");
  let onChainTicker = "";
  try {
    onChainTicker = parseMintAccountData({ data: { data: mintAccount.data } } as never).ticker ?? "";
  } catch {
    return pending("The token mint data could not be read.");
  }
  if (onChainTicker !== ticker) return pending(`The token is ${onChainTicker || "unknown"}, not ${ticker}.`);

  const txs = await reader.listTransactions(exp.tokenAccount);
  const creation = [...txs].reverse().find(isOk);
  const slot = creation?.slot ?? (await reader.height());
  return {
    kind: "verified",
    evidence: await evidenceFor(reader, {
      summary: `${ticker} token account owned by your wallet. Balance ${parsed.amount.toString()}.`,
      address: exp.tokenAccount,
      signature: creation?.signature,
      slot,
      readAtSlot: !creation,
    }),
  };
}

/** Mission 5. A successful Passkey Manager transaction moved tokens out of the user's token account. */
export async function verifyTokenTransfer(reader: ChainReader, tokenAccount: string): Promise<VerifyResult> {
  const txs = await reader.listTransactions(tokenAccount);
  for (const tx of txs) {
    if (tx.program !== PROGRAMS.passkeyManager || !isOk(tx) || !tx.readOnly.includes(PROGRAMS.token)) continue;
    const tail = parseTransferTail(tx.instruction);
    if (!tail || tail.amount <= 0n) continue;
    if (accountAt(tx, tail.fromIdx) !== tokenAccount) continue;
    const to = accountAt(tx, tail.toIdx);
    if (!to || to === tokenAccount) continue;
    return {
      kind: "verified",
      evidence: await evidenceFor(reader, {
        summary: `Moved ${tail.amount.toString()} raw units of THRUSD to ${to}.`,
        address: tokenAccount,
        signature: tx.signature,
        slot: tx.slot,
      }),
    };
  }
  const failed = txs.some((tx) => !isOk(tx) && tx.program === PROGRAMS.passkeyManager && tx.readOnly.includes(PROGRAMS.token));
  return pending(failed ? "A token transfer was submitted but the network rejected it. You may need THRUSD in the account first." : "No confirmed token transfer from your token account yet.");
}

/** The raw balance of a token account, or null when it does not exist or is not a token account. */
export async function readTokenBalance(reader: ChainReader, tokenAccount: string): Promise<bigint | null> {
  const account = await reader.getAccount(tokenAccount);
  if (!account || account.owner !== PROGRAMS.token) return null;
  return readTokenAccount(account)?.amount ?? null;
}
