# Next missions

These are intentionally not built. Each can be added as an entry in `missions/v1.ts` (or a `v2.ts`) plus, where noted, one verifier. Nothing below needs a server or a database of our own.

| Mission | What the user does | How the chain proves it | What it needs first |
|---|---|---|---|
| **Publish an ABI** | Publish a small ABI for a program with the CLI. | An ABI account owned by the ABI Manager program exists at the address derived from the user's seed, and its data parses. Read with `accounts.get`; the derivation helpers are in `@thru/programs/abi-manager`. | The CLI `abi account create` flow documented end to end on the current network, and a seed convention so Waypoint can derive the address. A tested success path. |
| **Call your own program** | Deploy a tiny C program and call it once. | A transaction whose `program` is the user's program executed without error, and the program account is owned by the Manager program. | The C toolchain install (`thru dev toolchain install`, needs glibc 2.38+), `thru program create`, and a fixed example program shipped in the repo. This is the heaviest mission; it should be a separate "advanced trail". |
| **Mint a token** | Create a token mint and mint to their own token account. | A mint account owned by the Token program whose `creator` is the user and whose `supply` is greater than zero. Parse with `parseMintAccountData`. | A wallet intent for `initialize_mint` (needs a state proof from `GenerateStateProof`) and funds for fees. Confirm the passkey wallet can sign it. |
| **Burn a token** | Burn a small amount from their token account. | A successful Passkey Manager transaction whose trailing action is the Token `burn` instruction against the user's token account, and the supply on the mint decreased. | Same as above, plus the `burn` instruction layout from the Token ABI. |
| **Claim a `.thru` name** | Register a name through the registrar. | A domain account owned by the Name Service program whose owner is the user. The CLI exposes `thru nameservice derive-domain-account`. | The registrar flow documented for passkey wallets, and rules for names (length, price, availability). |
| **Add a second passkey** | Add another device as an authority on the wallet. | `parseWalletAuthorities` shows two authorities. | A wallet intent for `add_authority`; confirm the hosted wallet exposes it to third-party sites. |
| **Create a signing session** | Approve a short-lived signer for repeated actions. | A session authority record on the wallet account with a future expiry. | The signing-sessions API (`wallet.sessions`) tested against the live wallet. |

## Adding a verified mission, in order

1. Do it by hand once on the live network and record the transaction and accounts with `scripts/capture-fixtures.mjs`.
2. Write the verifier as a pure function over `ChainAccount` and `ChainTx`, and test it against the recorded data, including a transaction that landed but failed.
3. Add the entry to the mission list. If it needs a new action in the wallet, add an intent builder in `src/wallet/intents.ts` and test the account ordering against the recorded transaction.
4. Run `e2e/happy-path.mjs` with the new step.
