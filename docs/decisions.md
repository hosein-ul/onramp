# Decisions

Each entry: decision, why. Newest last.

## D1 — Static Vite + React + TypeScript app, no server
The wallet SDK is browser-only and the Thru RPC serves gRPC-Web with permissive CORS (verified on Alphanet and Betanet), so no proxy or backend is needed. Deploys to any static host.

## D2 — Use official `@thru/*` packages only
`@thru/sdk`, `@thru/wallet`, `@thru/programs` are Apache-2.0. We read chain state through `@thru/sdk` (gRPC-Web) and decode with `@thru/programs`. No unofficial RPCs, no scraping.

## D3 — Pin `@thru/*` to 0.4.2
The published docs describe 0.3.16 (`wallet.connect`, `useWallet().wallet`). In 0.4.2 the API is namespaced: `wallet.connection.connect`, `wallet.accounts`, `wallet.deposits`, and `wallet.thru.signTransaction`. We code against the installed types, not the docs.

## D4 — Verification reads chain state only
Every mission is verified from `accounts.get`, `transactions.listForAccount`, `transactions.get`. Nothing is stored server-side; local cache is speed only and is always revalidated.

## D5 — Per-network config, never hardcoded mint
The THRUSD mint is not one global constant (the packaged address exists on Alphanet, not on Betanet). The mint comes from the wallet's `deposits.prepare`, and the app cross-checks it on-chain.

## D6 — Do not promise zero fees
Docs say fees are 0, but a CLI transfer on Alphanet charged 1 unit (`Required: 501 (transfer: 500 + fee: 1)`). The UI makes no claim about fees.

## D7 — Design: "Redline"
Chosen from three directions (a constructivist poster, a two-ink riso print, an instrument cluster). Redline fits the product: the data is live and numeric, so real gauges (RPC latency, block time, a bar-graph arc of recent blocks) carry meaning instead of decoration. Red marks "look here" or "your turn". Green is reserved for a fact the chain confirmed.

## D8 — A failed transaction never counts
A transaction that lands on chain can still have failed (a real recorded example has `userErrorCode 88`). Verifiers require `vmError == 0 && userErrorCode == 0` and test this with recorded failures.

## D9 — Account order follows the wallet, not the app
The wallet sorts writable accounts by raw bytes. Intent builders compute instruction indices from that order (`orderWritable`). The first attempt used fixed indices and produced a transaction that landed and failed.

## D10 — Verifiers are pure functions over plain data
`ChainAccount` and `ChainTx` are our own types. The network reader converts SDK objects into them; tests use fixtures recorded from the real network. This keeps verification logic independent of SDK internals.

## D11 — Wallet telemetry off
`telemetryEnabled: false` in the wallet SDK so an unofficial app does not forward diagnostics about its users to a third party.

## D12 — Receipts are pointers
A receipt link carries the address and signature only. The page that opens it re-verifies on chain and says so when the chain disagrees. A shared image or link cannot be used to claim something the chain does not show.

## D13 — Token destination is user-editable, with a tested default
Mission 5 sends to a token account the user can change, defaulting to a community sample account on Alphanet. The app checks on chain that the destination is a Token-program account before asking the wallet to sign.

## D14 — Open items
* The first-transfer target is the network faucet account (tested). Other networks need their own value in `src/config.ts`.
* Mission 5's success path needs real THRUSD (GitHub or X sign-in on the Thru Developers site). Its failure path is exercised end to end; its success path is covered by unit tests only.

## D15 — Mission 4 reframed: "Find your token account"
End-to-end testing showed the hosted wallet opens the THRUSD token account itself, two slots after creating the wallet (Multicall, then Token `initialize_account`, same fee payer). A mission that asks the user to open it would ask for something already done. It is now "Find your token account": same chain verification, honest copy. The "Open token account" action remains as a fallback for wallets without one.
