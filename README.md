# Waypoint

A guided trail through [Thru](https://thru.org), the RISC-V Layer-1. Create a passkey wallet, get test funds, send a transfer, open a token account and move a token. **Every mission is verified from on-chain data**, never from a flag the app sets itself.

> **Unofficial community project.** Waypoint is not affiliated with, endorsed by or supported by Unto Labs or Thru. It runs on the public test network only. Test funds have no value, and network rules (including fees) may change.

## What it does

| # | Mission | Verified by reading the chain |
|---|---------|-------------------------------|
| 1 | Create your wallet | The address is an account owned by the Passkey Manager program with at least one passkey authority. |
| 2 | Get test funds | The wallet account's native balance is greater than zero. |
| 3 | Send your first transfer | A transaction from your wallet to the target executed **without error** (`vmError == 0`, `userErrorCode == 0`). |
| 4 | Open a token account | A Token-program account owned by your wallet exists and its mint is `THRUSD` on chain. |
| 5 | Move a token | A transaction moved THRUSD out of your token account and executed without error. |

A transaction that lands on chain but fails is **not** counted. Progress is recomputed from the chain on every visit. There is no server, no database and no login. Receipts carry only pointers (address, signature); the page that opens a receipt link re-reads the chain and shows what the chain says.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

The embedded wallet uses passkeys, and browsers only allow passkeys on pages served over HTTPS (even on localhost). To try the wallet flow locally, serve over HTTPS with a certificate your browser trusts:

```bash
WAYPOINT_TLS_KEY=./dev.key WAYPOINT_TLS_CERT=./dev.pem npm run dev
```

Other commands:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # unit tests against recorded chain fixtures (offline)
npm run test:live    # reads the real network (opt-in)
npm run build        # static site in dist/, deploy to any static host
```

End to end (needs HTTPS, Chromium with Playwright and a way to fund a new wallet): see the header of `e2e/happy-path.mjs`.

### Getting test funds

* **Native THRU (mission 2)** comes from the CLI faucet. The wallet address is shown in the mission:
  ```bash
  npm i -g thru
  thru keys generate default
  thru account create default      # the key needs an on-chain account first
  thru faucet withdraw native <your address> 1000
  ```
  Faucet limits (as printed by the CLI): 10,000 per transaction, and per-recipient and per-fee-payer daily caps.
* **THRUSD (mission 5)** comes from [dev.thru.org/faucet](https://dev.thru.org/faucet) (GitHub or X sign-in, a token account is required first, 5 requests per minute per account). Opening the faucet does not prove funding. Waypoint shows your token balance as read from the chain.

## Add a mission

Missions are data. Each is an entry in a versioned list, `missions/v1.ts`:

```ts
{
  id: "my-mission",
  title: "Do the thing",
  goal: "One line.",
  steps: [{ text: "Step one." }, { text: "Run this.", code: "thru something {address}" }],
  action: { kind: "wallet-transfer", label: "Do it" },
  verifier: "native-transfer",
  reads: "The chain reads that decide it, shown to the user",
  requires: ["funds"],
}
```

1. Add the entry. If it uses an existing `verifier`, you are done.
2. For a new kind of check, write a function in `src/verify/verifiers.ts` that takes a `ChainReader` and returns `{ kind: "verified", evidence } | { kind: "pending", reason }`, add its name to the `verifier` union in `missions/types.ts`, and add a `case` in `src/trail/trail.ts`.
3. Test it against recorded data: `scripts/capture-fixtures.mjs` records real accounts and transactions into `tests/fixtures/`.

`docs/next-missions.md` lists candidate missions and what each needs.

## How verification works

`src/verify/` contains pure functions over plain data (`ChainAccount`, `ChainTx`). `src/verify/reader.ts` fills them from Thru's public gRPC-Web endpoint through the official `@thru/sdk`. Tests fill them from fixtures recorded from the real network.

Things worth knowing, all found by testing against the live network:

* A passkey wallet's transactions are built by the wallet. A native transfer is a `validate` instruction followed by a Passkey Manager `transfer` (`02`, two u16 account indices, a u64 amount). A token transfer has the same tail, with the Token program read-only in the account list.
* The wallet **sorts writable accounts by their raw address bytes** before assigning indices. Indices must follow that order, or the transaction lands and fails (`src/wallet/intents.ts`).
* Waypoint never signs. The official wallet signs after a passkey approval; Waypoint submits the signed bytes.

## Known limits

* Alphanet is the supported network. Betanet is configured but untested.
* The THRUSD mission needs test THRUSD, which requires a GitHub or X sign-in on the Thru Developers site. The token-transfer check is covered by unit tests built from a real recorded (failed) transaction, and the success path has not been exercised on the live network by the project.
* The hosted wallet shows an "Unverified" badge for origins it has not reviewed. No process for changing that is published.
* The `Unverified` wallet, the faucet sites and the RPC endpoint are run by Unto Labs and may change or reset without notice. Waypoint recomputes everything from the chain, so a reset simply shows missions as not done.
* Explorer links use `https://scan.thru.org/tx/<signature>` and `/address/<address>`.

## License

Apache-2.0. Uses the Apache-2.0 `@thru/sdk`, `@thru/wallet` and `@thru/programs` packages.
