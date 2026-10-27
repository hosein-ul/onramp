# Phase 0 — Reality check

Date of research: 2026-10-27. Every item is tagged **verified** (I ran it), **docs** (official docs say so, not independently tested) or **unverified**.

## 1. Networks and endpoints

| Network  | Endpoint                        | Chain ID | Status |
| -------- | ------------------------------- | -------- | ------ |
| Alphanet | `https://rpc.alphanet.thru.org` | 1        | verified live (height ~3.1M) |
| Betanet  | `https://rpc.betanet.thru.org`  | 2        | verified live (height ~7.3M) |

- Both serve gRPC and gRPC-Web on one URL (docs + verified).
- **CORS verified**: OPTIONS preflight and a real gRPC-Web `GetHeight` POST from `Origin: http://localhost:3000` succeed on both (`access-control-allow-origin` echoes the origin, `grpc-status: 0`). **No proxy is needed**; the app can be fully static.
- **Node verified**: `@thru/sdk` `createThruClient({ baseUrl })` works for `blocks.getBlockHeight`, `chain.getChainId`, `version.get`, `accounts.get`.
- Docs default the CLI and wallet examples to **Alphanet**. Betanet exists and the THRUSD faucet supports both.

## 2. Docs vs. reality: core programs

The core-programs docs warn the addresses target "the upcoming Alphanet reset". **Verified live on both networks**: the Token (`taTOKENKR…`), Passkey Manager (`taPASSIvj…`), NFT, Faucet (`taFCTxR0…`) and EOA programs exist as program accounts (`isProgram: true`). So the warning is stale for the current network, but our config must still treat addresses as per-network data and fail loudly when they are missing.

Address constants ship in `@thru/programs/bootstrap-addresses`.

**THRUSD mint**: the package exports `CREDITS_MINT_ADDRESS = taRfWjry…` (legacy name for THRUSD).
- Alphanet: account exists (115 bytes) but our parser reported "Mint account data is missing" via the default view — needs a re-check with the raw-account view. **unverified**.
- Betanet: `not_found`. So the mint is **not** a single global constant. The wallet resolves it via `deposits.prepare(DepositTarget.THRUSD)`; docs say "read mint metadata from the prepared destination instead of hardcoding it". The config will take the mint from that call and compare against chain state.

## 3. Licenses

- `@thru/sdk`, `@thru/wallet`, `@thru/programs`, `@thru/passkey`: **Apache-2.0**, repo `github.com/Unto-Labs/thru` (verified via `npm view`). Use in an open-source unofficial app is permitted; keep the NOTICE/attribution and do not imply endorsement.
- `@thru/helpers`, `@thru/proto` (0.2.x): no `license` field on npm. Not needed; we use `@thru/sdk` subpath exports instead.
- **Hosted wallet (`app.tid.sh`) terms**: I found no published terms of service in the docs. **unverified** — flagged for the user.

## 4. Embedded wallet for third-party sites

Verified with headless Chromium + a virtual WebAuthn authenticator, app served over HTTPS on `https://localhost:5173`:
- `BrowserSDK({ iframeUrl: "https://app.tid.sh/embedded", rpcUrl })` initializes and `connect()` shows the wallet modal.
- **No origin allow-list is required.** An arbitrary origin is accepted; the modal shows an **"Unverified"** badge next to the origin. The SDK's `TRUSTED_IFRAME_ORIGINS` list constrains the *wallet iframe URL* (`app.tid.sh`, `wallet.tid.sh`, localhost in dev), not the embedding app.
- Whether our production origin can get the "Unverified" badge removed is **unknown**; docs describe no process. I will ask Unto Labs / the user (see "Open questions").
- HTTPS is required in dev (docs, and the page I tested was HTTPS). Plain `http://localhost` forces a popup-window fallback.
- Wallet signing model (docs): the wallet owns fee payer, nonce and wire layout; `signTransaction(intent)` returns base64 raw bytes; **the dApp submits** with `thru.transactions.send`. The signer/fee payer is a manager profile and differs from the user's wallet address.
- **Verified end to end (Alphanet, headless Chromium, virtual passkey, 2026-10-27):**
  - "Create account" registers a passkey and creates a wallet account on-chain. `connection.connect()` returns `{ accounts: [{ accountType: "thru", address: "ta…", label }], selectedAccount, network: { id: "alphanet", chainId: 1, depositConfigured: true, depositProviders: ["coinbase","unifold"] } }`.
  - The wallet account is owned by the **Passkey Manager program**, has 82 bytes of data (`WalletAccount` header + one 65-byte passkey authority) and starts with balance 0.
  - **0.4.2 API differs from the docs (0.3.16):** `wallet.connection.connect`, `wallet.thru.signTransaction`, `wallet.getThru()`, `wallet.deposits`. Develop against the installed types.
  - Native transfer intent: `programAddress = PASSKEY_MANAGER_PROGRAM_ADDRESS`, `instructionData = encodeTransferInstruction({ walletAccountIdx, toAccountIdx, amount })`, `readWriteAddresses = [wallet, destination]`. The wallet shows an approval modal ("Transfer"), prepends `validate`, uses a wallet-managed fee payer, and returns base64 bytes; the app submits with `getThru().transactions.send`.
  - **Gotcha:** the wallet sorts writable accounts by raw address bytes, so indices are `2 + position in the sorted list`, not call order. My first attempt used fixed indices and the transaction landed but failed (`userErrorCode 88`). Compute indices from the sorted order.
  - **A landed transaction can have failed.** Success means `executionResult.vmError == 0 && userErrorCode == 0`. The good transfer shows `eventsCount: 2`, status `CLUSTER_EXECUTED`, and the wallet balance dropped 600 → 500.
  - **Fees:** transactions built by the wallet show `fee: 0`, but a CLI `transfer` charged 1 unit on Alphanet. The docs' "all fees are 0" is not reliable; the app will make no fee claims.
- Developer mode (`setDeveloperMode(true)`) is documented in the SDK types as adding a test faucet to the wallet's Add funds screen. **Not yet tested.**

## 5. Test funds (documented, not exercised)

- **Native THRU (verified)**: the CLI must reach the RPC (in this sandbox through a local TLS-verifying forwarder, since the Rust CLI ignores the proxy CA). Order matters: `thru account create default`, then `thru faucet withdraw native default 1000`. The key needs an existing on-chain account first. Limits shown by the CLI: 10,000 per tx, per recipient 50,000/day, per fee payer 20 withdrawals/day. Docs: CLI `thru faucet withdraw native default 1000` (raw units, capped 10,000 per tx, on-chain rate limit policy, no login). The Faucet program and vault exist on-chain on both networks (vault balance ~1e14), so this is real. There is **no browser faucet for native THRU in the docs**: the Fund mission must tell users to use the CLI (or an in-app transaction to the Faucet program, to be researched; **unverified**).
- **THRUSD**: `https://dev.thru.org/faucet` (redirects to `/login?next=/faucet`, verified). GitHub/X login, requires an **existing THRUSD token account**, `5 requests / rolling 60 s` per Developers account (shared across browser, CLI, API keys), admitted attempts consume quota. Prefill URL: `?network=<alphanet|betanet>&tokenAddress=ta…&amount=100&redirect_url=…`. Docs: "Opening or closing the faucet does not prove funding. Verify the balance before showing success."
- Fees are documented as 0; I will make no promise about future fees.

## 6. Mission verifiability

Reading tools verified: `accounts.get` (meta.balance, owner, data), `transactions.listForAccount(address)`, `transactions.get(signature)`, `events.list` with CEL filter, `blocks`, `height`.

| # | Mission | Verifiable today? | How |
|---|---------|-------------------|-----|
| 1 | Create wallet | **yes** | Connected address from `connect()` is a valid `ta…` address (32-byte decode). Stronger check: `accounts.get(address)` exists and is owned by the Passkey Manager program, `data` contains the `WalletAccount` header. Needs the wallet flow to confirm exact account fields. |
| 2 | Get test funds | **yes** | `accounts.get(address).meta.balance > 0n`. Caveat: if the wallet account is a managed account, the balance there may be 0 even after faucet withdrawal to a different key; need to confirm which account receives funds. |
| 3 | First transfer | **yes (verified)** | `transactions.listForAccount(wallet)`, then `transactions.get(sig)`: program == Passkey Manager, `vmError == 0 && userErrorCode == 0`, trailing instruction bytes decode as `transfer` (opcode 2, amounts u64 LE) with `to` equal to the target account at the stated index, and 2 events emitted. Failed transactions also appear in the list and must be rejected. |
| 4 | Open token account | **yes (verified)** | Derive `deriveTokenAccountAddress(owner, mint, tokenProgram)`; `accounts.get` must exist, owner program = Token program, `parseTokenAccountData` gives `owner == user` and `mint == expected`. Mint source is the wallet's `deposits.prepare`, see §2. **Verified live:** `deposits.prepare(DepositTarget.THRUSD)` returns `{ tokenAccountAddress, mintAddress: taRfWjry…, tokenProgramAddress, decimals: 6 }`; `deposits.ensureAccount({ destination })` created the account with no extra approval modal (73 bytes, owner = Token program, `parseTokenAccountData` → `{ mint, owner: wallet, amount: 0n, isFrozen: false }`, mint ticker `THRUSD`). The creation tx emits 1 event and has `userErrorCode 0`. |
| 5 | Move a token | **partly (no THRUSD obtainable headlessly)** | `listForAccount(userTokenAccount)` + decode Token `transfer` event (`source`, `dest`, `amount`) via `@thru/programs/token`. Needs a second token account as the target and some THRUSD first (rate-limited faucet). |

I am not yet replacing any mission. The only real risk is missions 3 and 5 because the intent shape for passkey-wallet transfers is unconfirmed.

### THRUSD funding limits what I could test
- The wallet's "Add funds" screen (also with developer mode on) is a **real-money crypto deposit** (Base address + QR; providers Coinbase/Unifold), not a test faucet. The app must not send users there.
- The only test-THRUSD path is `dev.thru.org` (GitHub/X login). I cannot complete that login autonomously, so mission 5 (token transfer) is **not yet exercised on chain**. Its verifier is built against the Token program codec and unit-tested with fixtures; a live run needs a human to request THRUSD once for a test wallet. Mission 5 stays in the Trail, labelled honestly.

## 7. Tech decision

Vite + React + TypeScript, fully static, deployable to any static host. Reasons: no server code at all, and the wallet SDK is browser-only. Stateless proxy is not needed.

## Open questions (need the user)

1. ~~Permission to create a throwaway wallet~~ granted and done (see §4).
2. Network choice for the live app: **Alphanet** (docs default, mint exists at the packaged address) vs Betanet.
3. Production origin: do you want me to draft a request to Unto Labs to remove the "Unverified" badge?
