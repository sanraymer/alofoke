import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import { faker } from "@faker-js/faker";
import TorControl from "tor-control";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";
import { EventEmitter } from "events";
import { URL } from "url";
import path from "path";

// 🔹 Evitar MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 1000;

// 🔹 Puppeteer Extra con Stealth
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Config
const VIEWS = parseInt(process.env.VIEWS) || 10;
const VIDEO_ID = process.env.VIDEO_ID || "KAApNx6OOKM";
const videoUrl = `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`;

// 🔹 Tor control
const tor = new TorControl({ host: "127.0.0.1", port: 9051, password: "" });
let torLock = false;

async function acquireTorLock() {
  while (torLock) await new Promise(r => setTimeout(r, 500));
  torLock = true;
}
function releaseTorLock() {
  torLock = false;
}
async function newTorIdentity() {
  await acquireTorLock();
  try {
    await new Promise((resolve, reject) =>
      tor.signalNewnym(err => (err ? reject(err) : resolve()))
    );
    await new Promise(r => setTimeout(r, 15000));
  } finally {
    releaseTorLock();
  }
}

// 🔹 Función para abrir un browser con proxy y userDataDir único
async function launchBrowserWithProxy(index) {
  const username = `iso_${index}_${Date.now()}`;
  const socksUpstream = `socks5h://${username}:x@127.0.0.1:9050`;
  const httpProxyUrl = await anonymizeProxy(socksUpstream);

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: null,
    userDataDir: path.join("/tmp", `puppeteer_profile_${index}`), // perfil independiente
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--mute-audio",
      `--proxy-server=${httpProxyUrl}`,
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  return { browser, httpProxyUrl, username };
}

// 🔹 Función de click seguro en Play
async function clickLargePlayButton(page) {
  try {
    await page.waitForSelector(".ytp-large-play-button.ytp-button", { timeout: 10000 });
    const btn = await page.$(".ytp-large-play-button.ytp-button");
    if (btn) await btn.click();
  } catch {}
}

// 🔹 Abrir un contexto/página
async function openContext(index) {
  console.log(`⏳ Preparando ventana ${index + 1}...`);
  await newTorIdentity();

  const { browser, httpProxyUrl, username } = await launchBrowserWithProxy(index);
  const page = await browser.newPage();

  // Autenticación proxy
  const urlParts = new URL(httpProxyUrl);
  await page.authenticate({
    username: urlParts.username,
    password: urlParts.password,
  });

  // UserAgent, locale y timezone
  const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();
  const languageCodes = [
    "af","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","en","es","et","eu",
    "fa","fi","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk",
    "km","kn","ko","lt","lv","mk","ml","mn","mr","ms","nb","ne","nl","nn","pa","pl","pt",
    "ro","ru","si","sk","sl","sq","sr","sv","ta","te","th","tr","uk","ur","vi","zh"
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

  await page.setViewport({
    width: 320 + Math.floor(Math.random() * 20),
    height: 180 + Math.floor(Math.random() * 10),
  });

  await page.goto(videoUrl, { waitUntil: "domcontentloaded" });
  await clickLargePlayButton(page);

  // Micro-interacciones
  const moveMouseRandom = async () => {
    const x = 50 + Math.floor(Math.random() * 220);
    const y = 40 + Math.floor(Math.random() * 120);
    await page.mouse.move(x, y, { steps: 10 });
  };
  const doScroll = async () => await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 50) });
  const microInterval = setInterval(async () => {
    try { await moveMouseRandom(); await doScroll(); } catch {}
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
    window.__yt_observer.observe(document.body, { childList: true, subtree: true });
  });

  console.log(`✅ Ventana ${index + 1} abierta con IP Tor única: ${username}`);

  // Reinicio automático y manejo de errores
  const watchMs = 300000 + Math.floor(Math.random() * 60000);
  setTimeout(async () => {
    console.log(`🔄 Reiniciando ventana ${index + 1} por tiempo cumplido`);
    try { await page.close(); } catch {}
    try { await browser.close(); } catch {}
    await openContext(index);
  }, watchMs);

  const errorSelector = ".ytp-error, .ytp-error-content-wrap";
  const poll = setInterval(async () => {
    try {
      const found = await page.$(errorSelector);
      if (found) {
        clearInterval(poll);
        console.log(`🔄 Reiniciando ventana ${index + 1} por YouTube error/bot-check`);
        try { await page.close(); } catch {}
        try { await browser.close(); } catch {}
        await openContext(index);
      }
    } catch {}
  }, 5000);
}

// 🔹 Lanzar todas las ventanas
for (let i = 0; i < VIEWS; i++) {
  openContext(i);
}

console.log("🎬 Todas las ventanas abiertas. Live streaming activo.");
