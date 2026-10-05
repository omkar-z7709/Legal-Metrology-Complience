/**
 * nav-probe — diagnostic for sidebar navigation vs. destination data loading.
 *
 * Answers: "is navigation slow, or is the page's data loading slow?"
 *
 * Per sidebar route, using DOM signals rather than network attribution (so a
 * request still in flight from the page you are *leaving* can't be mistaken for
 * the destination's own data):
 *
 *   shellMs        click -> destination SHELL rendered
 *                  (sidebar marks route active AND destination <h1> present)
 *   dataMs         click -> destination DATA rendered
 *                  (no `tr.animate-pulse` skeleton left, no visible [role=status])
 *   independent    shellMs < dataMs  => navigation did NOT wait on the fetch.
 *                  This is the property we care about; a route with no data to
 *                  fetch is always independent.
 *   api            every GET <apiOrigin>/* seen in the window, with DUPLICATE
 *                  markers. Includes calls from the outgoing page.
 *   rscRequests    RSC payload fetches. 0 means the client router cache served
 *                  it and NO server request happened for that navigation.
 *   documentReloads  document navigations. Must be 0; anything else is a real
 *                  full-page reload and a bug.
 *
 * Round 1 does a fresh goto("/") so every route is a first visit. Later rounds
 * deliberately skip the goto, so they measure repeat navigation inside one
 * document — where `experimental.staleTimes` should drive rscRequests to 0.
 *
 * Dev-only. Needs a browser + puppeteer-core, neither of which is a project dep:
 *   npm i -D puppeteer-core
 *   node scripts/nav-probe.mjs
 *
 * Options:
 *   --url=http://localhost:3000     override the dev server
 *   --chrome="C:\...\chrome.exe"    override the browser binary
 *   --rounds=3                      samples per route (median is reported)
 *
 * Caveat: measured against `next dev`, which compiles route chunks on demand.
 * Discard single-digit-second outliers on a cold cache; compare medians.
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = arg("url", "http://localhost:3000");
const ROUNDS = Number(arg("rounds", "3"));

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
})();

const SIDEBAR_ROUTES = [
  ["Inspections", "/inspections"],
  ["Reports", "/reports"],
  ["Products", "/products"],
  ["Compliance Analytics", "/analytics"],
  ["Rule Knowledge Base", "/rules"],
  ["Users & Roles", "/users"],
  ["Audit Logs", "/audit-logs"],
  ["Settings", "/settings"],
  ["Dashboard", "/"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const c = arg("chrome", null);
  if (c) return c;
  const guesses = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  const found = guesses.find((g) => fs.existsSync(g));
  if (!found) {
    throw new Error("No Chrome/Edge found. Pass --chrome=<path> or set CHROME_PATH.");
  }
  return found;
}

function loadPuppeteer() {
  try {
    return require("puppeteer-core");
  } catch {}
  // Not resolvable from here — try the repo root install.
  for (const candidate of [
    path.join(process.cwd(), "node_modules", "puppeteer-core"),
    path.join(import.meta.dirname, "..", "node_modules", "puppeteer-core"),
  ]) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  throw new Error(
    "puppeteer-core is not installed. Run:  npm i -D puppeteer-core\n" +
      "(It is intentionally not a project dependency — this is a local diagnostic.)"
  );
}

// A route has "committed its shell" once the sidebar marks it active AND the
// destination page's own <h1> has rendered. Data rows are deliberately NOT
// required — that is the whole point.
const hasCommitted = (label) => {
  const active = [...document.querySelectorAll("aside a")].find((a) =>
    a.className.includes("bg-[var(--navy-primary)]")
  );
  const heading = document.querySelector("h1");
  return (
    !!active &&
    active.textContent.trim().startsWith(label) &&
    !!heading &&
    !!heading.textContent.trim()
  );
};

// Destination data is ready once no skeleton row is left and no loading status
// line is still visible. Routes with nothing to fetch satisfy this immediately.
const hasData = () => {
  if (document.querySelectorAll("tr.animate-pulse").length > 0) return false;
  const status = document.querySelector("[role=status]");
  if (status && Number(getComputedStyle(status).opacity) > 0.1) return false;
  return true;
};

async function clickSidebar(page, label) {
  const handle = await page.evaluateHandle(
    (l) =>
      [...document.querySelectorAll("aside a")].find((a) =>
        a.textContent.trim().startsWith(l)
      ) || null,
    label
  );
  const el = handle.asElement();
  if (!el) throw new Error(`sidebar item not found: ${label}`);
  await el.click();
}

(async () => {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1500, height: 950 },
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("lm_auth_token", "dev-inspector");
    localStorage.setItem(
      "lm_auth_user",
      JSON.stringify({ name: "Nav Probe", role: "ADMIN" })
    );
  });

  let capture = false;
  let events = [];
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on("request", (r) => {
    if (!capture) return;
    events.push({ kind: "req", t: Date.now(), url: r.url(), method: r.method(), nav: r.isNavigationRequest() });
  });
  page.on("response", (r) => {
    if (!capture) return;
    events.push({ kind: "res", t: Date.now(), url: r.url(), method: r.request().method(), status: r.status() });
  });

  console.error(`nav-probe: warming ${SIDEBAR_ROUTES.length} routes against ${BASE} …`);
  const allPaths = [...new Set(SIDEBAR_ROUTES.map(([, href]) => href))];
  for (let pass = 0; pass < 2; pass++) {
    for (const href of allPaths) {
      await page.goto(BASE + href, { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(400);
    }
  }

  const acc = new Map();
  for (let round = 0; round < ROUNDS; round++) {
    // Only round 1 hard-loads. Later rounds keep the same document so they
    // measure repeat navigation, where the router cache should kick in.
    if (round === 0) {
      await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 120000 });
      await sleep(1200);
    }

    for (const [label, href] of SIDEBAR_ROUTES) {
      events = [];
      capture = true;
      const t0 = Date.now();
      await clickSidebar(page, label);

      let shellMs = null;
      try {
        await page.waitForFunction(hasCommitted, { timeout: 30000, polling: 16 }, label);
        shellMs = Date.now() - t0;
      } catch {
        shellMs = -1;
      }

      let dataMs = null;
      try {
        await page.waitForFunction(hasData, { timeout: 30000, polling: 100 });
        dataMs = Date.now() - t0;
      } catch {
        dataMs = -1;
      }

      await sleep(600);
      capture = false;
      const batch = events.slice();

      const apiReqs = batch.filter(
        (e) => e.kind === "req" && e.url.startsWith(API_ORIGIN) && e.method === "GET"
      );
      const apiRes = batch.filter(
        (e) => e.kind === "res" && e.url.startsWith(API_ORIGIN) && e.method === "GET"
      );
      const rsc = batch.filter((e) => e.kind === "req" && e.url.includes("_rsc"));
      const docNavs = batch.filter((e) => e.kind === "req" && e.nav && !e.url.includes("_rsc"));

      const seen = new Map();
      const api = apiReqs.map((r) => {
        const key = r.url + r.method;
        const n = (seen.get(key) || 0) + 1;
        seen.set(key, n);
        const res = apiRes.find((x) => x.url === r.url);
        return {
          call: `${r.method} ${r.url.slice(API_ORIGIN.length)}`,
          duplicate: n > 1 ? n : false,
          status: res ? res.status : null,
          ms: res ? res.t - r.t : null,
        };
      });

      const entry =
        acc.get(href) ||
        { shell: [], data: [], rscTotal: 0, reloadTotal: 0, independent: [], apiByRound: {} };
      entry.shell.push(shellMs);
      entry.data.push(dataMs);
      if (shellMs > 0 && dataMs >= 0) entry.independent.push(shellMs < dataMs);
      entry.rscTotal += rsc.length;
      entry.reloadTotal += docNavs.length;
      entry.apiByRound[`round${round + 1}`] = api;
      acc.set(href, entry);
    }
  }

  const report = [...acc.entries()].map(([route, v]) => ({
    route,
    shellMs_samples: v.shell,
    shellMs_median: median(v.shell.filter((x) => x > 0)),
    dataMs_median: median(v.data.filter((x) => x >= 0)),
    navigationDidNotWaitOnData: v.independent.length
      ? v.independent.every(Boolean)
      : "no data to wait for",
    rscRequests_total: v.rscTotal,
    documentReloads_total: v.reloadTotal,
    api_byRound: v.apiByRound,
  }));

  console.log(
    JSON.stringify(
      {
        base: BASE,
        apiOrigin: API_ORIGIN,
        rounds: ROUNDS,
        browser: (() => { try { return execSync(`"${findChrome()}" --version`).toString().trim(); } catch { return findChrome(); } })(),
        routes: report,
        pageErrors,
      },
      null,
      2
    )
  );

  await browser.close();
})().catch((e) => {
  console.error("nav-probe failed:", e);
  process.exit(1);
});