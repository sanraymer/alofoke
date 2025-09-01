import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import readline from "readline";
import { faker } from "@faker-js/faker";
import { EventEmitter } from 'events';

// 🔹 Evitar MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 1000;

// 🔹 Inicializar puppeteer-extra con stealth
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Configuración
const VIEWS = parseInt(process.env.VIEWS) || 1;
const VIDEO_ID = process.env.VIDEO_ID || "hsANqBeLrS8";
const CONFIG = {
  url: `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`,
  cantidad: VIEWS,
};

console.log(`🎯 Configuración: ${VIEWS} vistas para video ${VIDEO_ID}`);
console.log(`🔗 URL: ${CONFIG.url}`);

const browsers = [];

// Click seguro en el botón grande de Play
const clickLargePlayButton = async (page) => {
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
  };

async function openVideo(url, index) {
  try {
    const categories = ["desktop", "mobile", "tablet"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const userAgent = new UserAgent({ deviceCategory: randomCategory }).toString();

    const languageCodes = [
      "af","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","en","es","et","eu","fa","fi","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk","km","kn","ko","lt","lv","mk","ml","mn","mr","ms","nb","ne","nl","nn","pa","pl","pt","ro","ru","si","sk","sl","sq","sr","sv","ta","te","th","tr","uk","ur","vi","zh"
    ];
    const lang = faker.helpers.arrayElement(languageCodes);
    const country = faker.location.countryCode("alpha-2");
    const locale = `${lang}-${country}`;
    const timezone = faker.location.timeZone();

    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--user-agent=${userAgent}`,
        `--lang=${locale}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--mute-audio",
      ],
    });

    const page = await browser.newPage();

    // 🔹 Limitar ancho de banda
    /*const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 100,             // latencia simulada ms
      downloadThroughput: 500 * 1024, // 500 KB/s 
      uploadThroughput: 512     // bytes/s (0.5 KB/s)
    });*/

    // 🔹 Interceptar requests
    let lastAllowedTime = 0;
    const INTERVAL = 10000; // 10 segundos

    await page.setRequestInterception(true);

    page.on("request", request => {
        const url = request.url();
        const now = Date.now();

        if (url.includes("googlevideo.com")) {
            if (now - lastAllowedTime >= INTERVAL) {
                lastAllowedTime = now;
                console.log(`✅ Permitido.`);
                request.continue();
            } else {
                console.log(`❌ Abortado.`);
                request.abort();
            }
        } else {
            request.continue();
        }
    });



    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': `${locale},${lang};q=0.9`,
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com'
    });

    await page.setViewport({
      width: 320 + Math.floor(Math.random() * 60),
      height: 180 + Math.floor(Math.random() * 30),
    });

    browsers.push(browser);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await clickLargePlayButton(page);

    // 🔹 Mantener reproducción
    await page.evaluate(() => {
      const vid = document.querySelector("video");
      if (vid) {
        vid.muted = true;
        vid.play().catch(()=>{});
      }
    });

  } catch (err) {
    console.error(`Error en instancia ${index + 1}: ${err.message}`);
  }
}

// Lanzar instancias
for (let i = 0; i < CONFIG.cantidad; i++) {
  setTimeout(() => openVideo(CONFIG.url, i), i * 5000);
}

// Q para cerrar todas las instancias
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", async (input) => {
  if (input.toLowerCase() === "q") {
    console.log("Cerrando todas las instancias...");
    for (const browser of browsers) {
      try { await browser.close(); } catch {}
    }
    process.exit(0);
  }
});
