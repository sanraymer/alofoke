import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import { faker } from "@faker-js/faker";
import TorControl from "tor-control";
import { anonymizeProxy } from "proxy-chain";
import { EventEmitter } from "events";
import { URL } from "url";

// Evitar MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 1000;

puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

const VIEWS = parseInt(process.env.VIEWS) || 1;
const VIDEO_ID = process.env.VIDEO_ID || "Xl8ST0qpLyA";
const VIDEO_URL = `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`;

// Tor control
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
    await new Promise((r) => setTimeout(r, 15000));
  } finally {
    releaseTorLock();
  }
}

// 🔹 Abrir navegador UNA SOLA VEZ
let browser;
async function getBrowser() {
  if (!browser) {
    try {
      console.log("⏳ Solicitando nueva IP de Tor para el navegador principal...");
      await newTorIdentity();

      const username = `iso_${Date.now()}`;
      const forwardUsername = encodeURIComponent(username);
      const socksUpstream = `socks5h://${forwardUsername}:x@127.0.0.1:9050`;
      const httpProxyUrl = await anonymizeProxy(socksUpstream);

      browser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--mute-audio",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          `--proxy-server=${httpProxyUrl}`,
        ],
      });

      console.log(`🌐 Navegador lanzado con proxy global: ${httpProxyUrl}`);
    } catch (error) {
      console.error("❌ Error al lanzar el navegador:", error);
      return null; 
    }
  }
  return browser;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Movimientos del mouse
async function humanMouse(page) {
  const box = { x: 100, y: 100, width: 300, height: 200 };
  for (let i = 0; i < Math.floor(Math.random() * 5) + 3; i++) {
    try {
      const x = box.x + Math.floor(Math.random() * box.width);
      const y = box.y + Math.floor(Math.random() * box.height);
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
      await sleep(Math.floor(Math.random() * 2000) + 500);
    } catch (err) {
      console.log("⚠️ humanMouse: La página ya se cerró, abortando movimientos");
      break;
    }
  }
}

// Scroll aleatorio
async function humanScroll(page) {
  const scrollTimes = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < scrollTimes; i++) {
    try {
      const scrollY = Math.floor(Math.random() * 500);
      await page.evaluate(y => window.scrollBy(0, y), scrollY);
      await sleep(Math.floor(Math.random() * 1500) + 500);
    } catch (err) {
      console.log("⚠️ humanScroll: La página ya se cerró, abortando scroll");
      break;
    }
  }
}

// Boton de play
async function handlePlayButton(page) {
  try {
    // Desktop
    const desktopBtn = await page.$(".ytp-large-play-button.ytp-button");
    if (desktopBtn) {
      await desktopBtn.click();
      humanMouse(page);
      humanScroll(page);
      console.log("▶ Play presionado (desktop)");
      return;
    }

    // Mobile
    const mobileBtn = await page.$("c3-icon.ytmCuedOverlayPlayButtonIcon");
    if (mobileBtn) {
      await page.evaluate(el => el.click(), mobileBtn);
      console.log("▶ Play presionado (mobile)");
      return;
    }

    console.log("ℹ️ No se encontró botón de play");
  } catch (err) {
    console.log("⚠️ Error al presionar play:", err.message);
  }
}

// 🔹 Abrir un contexto con proxy e IP única y rotarlo cada minuto
async function openContext(index) {
  console.log(`⏳ Preparando ventana ${index + 1}...`);
  await newTorIdentity();

  const username = `iso_${index}_${Date.now()}`;
  const socksUpstream = `socks5h://${username}:x@127.0.0.1:9050`;
  const httpProxyUrl = await anonymizeProxy(socksUpstream);

  const browser = await getBrowser();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  const urlParts = new URL(httpProxyUrl);
  await page.authenticate({
    username: urlParts.username,
    password: urlParts.password,
  });

  // User-Agent
  const categories = ["desktop", "mobile", "tablet"]; // ["desktop", "mobile", "tablet"];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const userAgent = new UserAgent({ deviceCategory: randomCategory }).toString();

  const languageCodes = [
    "af","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","en","es","et","eu","fa","fi","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk","km","kn","ko","lt","lv","mk","ml","mn","mr","ms","nb","ne","nl","nn","pa","pl","pt","ro","ru","si","sk","sl","sq","sr","sv","ta","te","th","tr","uk","ur","vi","zh"
  ];
  const lang = faker.helpers.arrayElement(languageCodes);
  const country = faker.location.countryCode("alpha-2");
  const locale = `${lang}-${country}`;
  const timezone = faker.location.timeZone();

  await page.setUserAgent(userAgent);
  await page.setExtraHTTPHeaders({
    "Accept-Language": `${locale},${lang};q=0.9`,
    Referer: "https://www.youtube.com/",
    Origin: "https://www.youtube.com",
  });
  await page.emulateTimezone(timezone);

  // Viewport aleatorio
  await page.setViewport({
    width: 320 + Math.floor(Math.random() * 300),
    height: 180 + Math.floor(Math.random() * 300),
  });

  // Tipo de conexión
  // Así un viewer puede simular estar en 3G, 4G o WiFi
  const connections = [
    { download: 500 * 1024, upload: 500 * 1024, latency: 150 }, // 3G
    { download: 1.5 * 1024 * 1024, upload: 750 * 1024, latency: 40 }, // 4G
    { download: 5 * 1024 * 1024, upload: 2 * 1024 * 1024, latency: 20 }, // WiFi
  ];
  const client = await page.target().createCDPSession();
  const conn = connections[Math.floor(Math.random() * connections.length)];
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: conn.download,
    uploadThroughput: conn.upload,
    latency: conn.latency,
  });

  // Ir a YouTube home
  await page.goto(VIDEO_URL, { waitUntil: "domcontentloaded" });

  // Botón de play
  try {
    handlePlayButton(page);
  } catch {}

  console.log(`✅ Ventana ${index + 1} abierta con IP: ${username}`);

  // 🔹 Polling para detectar errores de YouTube y reiniciar solo este tab
  const errorSelector = ".ytp-error, .ytp-error-content-wrap";
  const poll = setInterval(async () => {
    try {
      const found = await page.$(errorSelector);
      if (found) {
        clearInterval(poll);
        console.log(`⚠️ Error detectado en ventana ${index + 1}, reiniciando tab...`);
        try { await page.close(); } catch {}
        try { await context.close(); } catch {}
        await openContext(index);
      }
    } catch {}
  }, 5000);

}

// 🔹 Lanzar todas las ventanas en el mismo navegador
(async () => {
  for (let i = 0; i < VIEWS; i++) {
    await new Promise(r => setTimeout(r, 2000)); // espera 2s entre ventanas
    openContext(i);
  }
})();