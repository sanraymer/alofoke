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
const videoUrl = `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`;

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
    console.log("⏳ Solicitando nueva IP de Tor para el navegador principal...");
    await newTorIdentity();

    // Proxy Tor global para TODO el navegador
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
  }
  return browser;
}

// 🔹 Abrir un contexto con proxy e IP única
async function openContext(index) {
  console.log(`⏳ Preparando ventana ${index + 1}...`);
  await newTorIdentity();

  // Proxy Tor único
  const username = `iso_${index}_${Date.now()}`;
  const socksUpstream = `socks5h://${username}:x@127.0.0.1:9050`;
  const httpProxyUrl = await anonymizeProxy(socksUpstream);

  // Reutilizar navegador global
  const browser = await getBrowser();

  // Crear contexto aislado
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Autenticación de proxy
  const urlParts = new URL(httpProxyUrl);
  await page.authenticate({
    username: urlParts.username,
    password: urlParts.password,
  });

  // UserAgent + idioma + zona horaria
  const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();
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

  await page.setViewport({
    width: 320 + Math.floor(Math.random() * 20),
    height: 180 + Math.floor(Math.random() * 10),
  });

  // Ir al video
  await page.goto(videoUrl, { waitUntil: "domcontentloaded" });

  // Play
  try {
    await page.waitForSelector(".ytp-large-play-button.ytp-button", { timeout: 10000 });
    const btn = await page.$(".ytp-large-play-button.ytp-button");
    if (btn) await btn.click();
  } catch {}

  console.log(`✅ Ventana ${index + 1} abierta en contexto aislado con IP: ${username}`);

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
        // Reinicia solo este contexto
        await openContext(index);
      }
    } catch {}
  }, 5000);

}

// 🔹 Lanzar todas las ventanas en el mismo navegador
(async () => {
  for (let i = 0; i < VIEWS; i++) {
    openContext(i);
  }
})();
