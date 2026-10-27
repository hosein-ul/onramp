// End-to-end run against the live test network, with a virtual passkey.
// Needs: the app served over HTTPS (passkeys require it), a Chromium with Playwright, and a way to fund a new wallet.
//   APP_URL        default https://localhost:5174
//   SPKI           base64 SHA-256 of the dev certificate public key (lets Chromium trust a self-signed dev cert for this run only)
//   FUND_CMD       shell command with {address}, e.g. "thru --network alpha faucet withdraw native {address} 1000"
//   SHOTS          directory for screenshots
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");
const APP = process.env.APP_URL ?? "https://localhost:5174";
const SHOTS = process.env.SHOTS ?? "e2e/out";
const FUND = process.env.FUND_CMD;
mkdirSync(SHOTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await chromium.launch({ args: process.env.SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.SPKI}`] : [] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

const wallet = () => page.frames().find((f) => f.url().includes("app.tid.sh"));
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const key = (i) => page.locator(".key").nth(i);
const stateOf = async (i) => (await key(i).getAttribute("class"))?.split(" ").find((c) => ["verified", "ready", "locked", "error", "checking", "verifying"].includes(c));

async function approveIfPrompted(timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = wallet();
    try {
      if (f && /Approve transaction/i.test(await f.locator("body").innerText({ timeout: 1000 }))) { await f.getByRole("button", { name: "Approve", exact: true }).click(); return true; }
    } catch { /* frame navigating */ }
    await sleep(500);
  }
  return false;
}
async function waitFor(fn, ms, step = 1500) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(step); } return false; }
async function openMission(i) { await key(i).click(); await page.locator(".panel").waitFor(); }
async function closePanel() { await page.getByRole("button", { name: "Close mission" }).click(); await sleep(300); }
const panelMsg = async () => (await page.locator(".mp-msg[aria-live]").innerText()).trim();

process.on("unhandledRejection", () => undefined);
async function dump(label) { await shot(`FAIL-${label}`).catch(() => undefined); console.log("PANEL TEXT:", (await page.locator(".panel").innerText({ timeout: 2000 }).catch(() => "(no panel)")).replace(/\n+/g, " | ").slice(0, 600)); }
try {
await page.goto(`${APP}/#/trail`);
check("trail loads with mission 1 ready and the rest locked", (await waitFor(async () => (await stateOf(0)) === "ready", 15000)) && (await stateOf(1)) === "locked");

// 1. Create wallet
await page.locator(".topbar").getByRole("button", { name: "Connect wallet" }).click();
await sleep(4000);
await wallet().getByText("Create account", { exact: true }).first().click();
await sleep(2500);
await wallet().getByRole("button", { name: "Create account", exact: true }).click();
await sleep(9000);
await wallet().getByRole("button", { name: "Connect", exact: true }).click();
check("wallet connects and shows an address", await waitFor(async () => (await page.locator(".chip.wallet .mono").count()) > 0, 20000));
const address = await page.locator(".chip.wallet .mono").getAttribute("title");
console.log("ADDRESS", address);
await shot("01-connected");

await openMission(0);
check("mission 1 verifies from chain data", await waitFor(async () => { await page.getByRole("button", { name: /^Verify( again)?$/ }).click(); await sleep(2500); return (await stateOf(0)) === "verified"; }, 60000, 500));
check("mission 1 shows a receipt", (await page.locator(".receipt").count()) === 1);
await shot("02-mission1-receipt");
await closePanel();
check("mission 2 unlocks after mission 1", (await stateOf(1)) === "ready");

// 2. Funds, from the CLI faucet
if (FUND) {
  execSync(FUND.replace("{address}", address), { stdio: "pipe" });
  await openMission(1);
  check("mission 2 verifies after the faucet pays out", await waitFor(async () => { await page.getByRole("button", { name: /^Verify( again)?$/ }).click(); await sleep(2500); return (await stateOf(1)) === "verified"; }, 60000, 500));
  await shot("03-mission2");
  await closePanel();

  // 3. Native transfer
  await openMission(2);
  await page.getByRole("button", { name: "Send transfer" }).click();
  check("wallet asks for approval of the transfer", await approveIfPrompted());
  check("mission 3 verifies after the network executes the transfer", await waitFor(async () => (await stateOf(2)) === "verified", 60000, 1000), await panelMsg());
  await shot("04-mission3");
  const link = await page.locator(".receipt-actions a").getAttribute("href");
  check("receipt links to the explorer transaction", /\/tx\/ts/.test(link ?? ""), link ?? "");
  await closePanel();

  // 4. Token account
  // The hosted wallet opens a THRUSD token account itself when it creates the wallet. Open the panel only if it is not verified yet.
  if ((await stateOf(3)) !== "verified") {
    await openMission(3);
    const open = page.getByRole("button", { name: "Open token account" });
    if (await open.isVisible().catch(() => false)) { await open.click(); await approveIfPrompted(8000); }
    await closePanel();
  }
  check("mission 4 verifies the THRUSD token account", await waitFor(async () => (await stateOf(3)) === "verified", 60000, 1000));
  await openMission(3);
  await shot("05-mission4");
  await closePanel();

  // 5. Token transfer without any THRUSD: must fail honestly, never show success
  await openMission(4);
  await page.getByRole("button", { name: "Send THRUSD" }).click();
  await approveIfPrompted(20000);
  await waitFor(async () => /rejected|not yet|No confirmed/i.test(await panelMsg()), 60000, 1000);
  const msg5 = await panelMsg();
  check("mission 5 does not claim success without THRUSD", (await stateOf(4)) !== "verified" && /rejected|No confirmed|not yet/i.test(msg5), msg5);
  await shot("06-mission5-honest-failure");
  await closePanel();

  // Progress is recomputed from the chain: a fresh page load must show the same states.
  await page.reload();
  check("after a reload the chain still shows missions 1 to 4 verified", await waitFor(async () => (await Promise.all([0, 1, 2, 3].map(stateOf))).every((s) => s === "verified"), 60000, 1500));
  await shot("07-after-reload");
}

} catch (e) { console.log("SCRIPT ERROR", String(e).slice(0, 300)); await dump("error"); results.push({ name: "script completed", ok: false }); }

const important = consoleErrors.filter((e) => !/Failed to load resource|favicon|web-share/i.test(e));
check("no console errors from the app", important.length === 0, important.join(" | ").slice(0, 300));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
