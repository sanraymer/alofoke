import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import { faker } from "@faker-js/faker";
import TorControl from "tor-control";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";
import { EventEmitter } from "events";
import { URL } from "url";

// 🔹 Evitar MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 1000;

// 🔹 Puppeteer Extra con Stealth
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Config
const VIEWS = 10;
const VIDEO_ID = "KAApNx6OOKM";
const videoUrl = `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`;

// 🔹 Tor control
const tor = new TorControl({ host: "127.0.0.1", port: 9051, password: "" });
let torLock = false;

async function acquireTorLock() {
  while (torLock) await new Promise((r) => setTimeout(r, 500));
  torLock = true;
}
function releaseTorLock() {
  torLock = false;
}

async function newTorIdentity() {
  await acquireTorLock();
  try {
    await new Promise((resolve, reject) =>
      tor.signalNewnym((err) => (err ? reject(err) : resolve()))
    );
    await new Promise((r) => setTimeout(r, 15000)); // cooldown de Tor
  } finally {
    releaseTorLock();
  }
}

// 🔹 Lanzar 1 Chrome
const browser = await puppeteer.launch({
  headless: true,
  ignoreHTTPSErrors: true,
  defaultViewport: null,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--mute-audio",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
  ],
});

const contexts = [];

// 🔹 Función de click seguro en Play
const clickLargePlayButton = async (page) => {
  try {
    await page.waitForSelector(".ytp-large-play-button.ytp-button", {
      timeout: 10000,
    });
    const btn = await page.$(".ytp-large-play-button.ytp-button");
    if (btn) await btn.click();
  } catch {}
};

// 🔹 Función para reiniciar un contexto
async function restartContext(index, reason) {
  const ctx = contexts[index];
  if (!ctx) return;

  console.log(`🔄 Reiniciando ventana ${index + 1} por: ${reason}`);

  // Cleanup
  try { await ctx.page.close(); } catch {}
  try { await ctx.context.close(); } catch {}
  try { await closeAnonymizedProxy(ctx.httpProxyUrl, true); } catch {}
  contexts[index] = null;

  // Espera y relanza
  await newTorIdentity();
  await new Promise(r => setTimeout(r, 10000 + Math.floor(Math.random() * 5000)));
  await openContext(index);
}

// 🔹 Función para abrir un contexto nuevo
async function openContext(index) {
  console.log(`⏳ Preparando ventana ${index + 1}...`);
  await newTorIdentity();

  const username = `iso_${index}_${Date.now()}`;
  const socksUpstream = `socks5h://${username}:x@127.0.0.1:9050`;
  const httpProxyUrl = await anonymizeProxy(socksUpstream);

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Autenticación proxy
  const urlParts = new URL(httpProxyUrl);
  await page.authenticate({
    username: urlParts.username,
    password: urlParts.password,
  });

  // UserAgent, locale y timezone
  const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();
  const lang = faker.helpers.arrayElement(["en", "es", "fr", "de", "it", "pt"]);
  const country = faker.location.countryCode("alpha-2");
  const locale = `${lang}-${country}`;
  const timezone = faker.location.timeZone();

  await page.setUserAgent(userAgent);
  await page.setExtraHTTPHeaders({
    "Accept-Language": `${locale},${lang};q=0.9`,
    Referer: "https://www.youtube.com/",
    Origin: "https://www.youtube.com",
  });

  await page.setViewport({
    width: 640 + Math.floor(Math.random() * 50),
    height: 360 + Math.floor(Math.random() * 50),
  });

  await page.goto(videoUrl, { waitUntil: "domcontentloaded" });
  await clickLargePlayButton(page);

  // Micro-interacciones
  const moveMouseRandom = async () => {
    const x = 50 + Math.floor(Math.random() * 220);
    const y = 40 + Math.floor(Math.random() * 120);
    await page.mouse.move(x, y, { steps: 10 });
  };
  const doScroll = async () =>
    await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 50) });

  const microInterval = setInterval(async () => {
    try {
      await moveMouseRandom();
      await doScroll();
    } catch {}
  }, 5000 + Math.floor(Math.random() * 5000));

  page.on("close", () => clearInterval(microInterval));

  // Skip ads observer
  await page.evaluate(() => {
    window.__yt_observer = new MutationObserver(() => {
      try {
        const skipBtn = document.querySelector(".ytp-ad-skip-button.ytp-button");
        if (skipBtn) skipBtn.click();
      } catch {}
    });
    window.__yt_observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

  // Guardar referencia
  contexts[index] = { context, page, httpProxyUrl };
  console.log(`✅ Ventana ${index + 1} abierta con IP Tor única: ${username}`);

  // 🔹 Timer de reinicio automático (5–6 min)
  const watchMs = 300000 + Math.floor(Math.random() * 60000);
  setTimeout(() => restartContext(index, "tiempo cumplido"), watchMs);

  // 🔹 Polling de error/bot-check
  const errorSelector = ".ytp-error, .ytp-error-content-wrap";
  const poll = setInterval(async () => {
    try {
      const found = await page.evaluate(sel => !!document.querySelector(sel), errorSelector);
      if (found) {
        clearInterval(poll);
        await restartContext(index, "YouTube error/bot-check");
      }
    } catch {}
  }, 5000);
}

// 🔹 Lanzar todas las ventanas
for (let i = 0; i < VIEWS; i++) {
  openContext(i);
}

console.log("🎬 Todas las ventanas abiertas. Live streaming activo.");

// Cleanup general al salir
process.on("SIGINT", async () => {
  console.log("Cerrando todas las ventanas...");
  for (const c of contexts) {
    if (!c) continue;
    try { await c.page.close(); } catch {}
    try { await c.context.close(); } catch {}
    try { await closeAnonymizedProxy(c.httpProxyUrl, true); } catch {}
  }
  try { await browser.close(); } catch {}
  process.exit(0);
});
