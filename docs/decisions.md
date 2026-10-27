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
