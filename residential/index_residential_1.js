import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import readline from "readline";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 5;
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Configuración
const VIEWS = parseInt(process.env.VIEWS) || 1;
const VIDEO_ID = process.env.VIDEO_ID || "DaoxoYGuks4";
const CONFIG = { 
  url: `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`,
  cantidad: VIEWS,
};

console.log(`🎯 Configuración: ${VIEWS} vistas para video ${VIDEO_ID}`);
console.log(`🔗 URL: ${CONFIG.url}`);

const browsers = [];

// 🔹 Datos CherryProxy (usuario fijo)
const proxyHost = 'ade.360s5.com';
const proxyPort = 3600;
const proxyUsername = '46908439-zone-custom'; // usuario fijo
const proxyPassword = 'UAHMYyFC';

// 🔹 Click seguro en Play
const clickLargePlayButton = async (page) => {
  try {
    await page.waitForSelector(".ytp-large-play-button.ytp-button", { timeout: 10000 });
    const btn = await page.$(".ytp-large-play-button.ytp-button");
    if (btn) await btn.click();
    console.log("✅ Click inicial en Play realizado");
  } catch {
    console.log("⚠️ Botón de Play no encontrado o ya en reproducción");
  }
};

// 🔹 Abrir video con proxy CherryProxy
async function openVideo(url, index) {
  let browser;
  let moveMouseInterval, clickCenterInterval, restartTimeout;

  try {
    const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();

    console.log(`🌐 Abriendo instancia ${index + 1} con proxy: ${proxyUsername}@${proxyHost}:${proxyPort}`);

    browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--user-agent=${userAgent}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--mute-audio",
        `--proxy-server=http://${proxyHost}:${proxyPort}`,
      ],
    });

    const page = await browser.newPage();
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
    await page.setUserAgent(userAgent);

    await page.setViewport({
      width: 800 + Math.floor(Math.random() * 200),
      height: 600 + Math.floor(Math.random() * 100),
    });

    browsers.push(browser);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    console.log(`✅ Instancia ${index + 1} cargó URL correctamente`);

    await clickLargePlayButton(page);

    // 🔹 Micro-interacciones humanas
    moveMouseInterval = setInterval(async () => {
      try {
        const x = 50 + Math.floor(Math.random() * 220);
        const y = 40 + Math.floor(Math.random() * 120);
        await page.mouse.move(x, y, { steps: 10 });
      } catch {}
    }, 3000 + Math.floor(Math.random() * 4000));

    clickCenterInterval = setInterval(async () => {
      try {
        const x = 160 + Math.floor(Math.random() * 20) - 10;
        const y = 90 + Math.floor(Math.random() * 10) - 5;
        await page.mouse.click(x, y, { delay: 20 + Math.floor(Math.random() * 80) });
      } catch {}
    }, 7000 + Math.floor(Math.random() * 3000));

    // 🔹 Reproducir video y silenciar
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) {
        video.muted = true;
        video.play().catch(() => {});
        video.addEventListener("pause", () => video.play());
      }
    });

    // 🔹 Reinicio automático
    const watchMs = 60000 + Math.floor(Math.random() * 30000);
    restartTimeout = setTimeout(async () => {
      try {
        clearInterval(moveMouseInterval);
        clearInterval(clickCenterInterval);
        await browser.close();
        openVideo(url, index); // reiniciar la misma instancia
      } catch {}
    }, watchMs);

  } catch (err) {
    console.error(`❌ Error en instancia ${index + 1}: ${err.message}`);
    try { if (browser) await browser.close(); } catch {}
    if (moveMouseInterval) clearInterval(moveMouseInterval);
    if (clickCenterInterval) clearInterval(clickCenterInterval);
    if (restartTimeout) clearTimeout(restartTimeout);
  }
}

// 🔹 Lanzar instancias escalonadas
(async () => {
  for (let i = 0; i < CONFIG.cantidad; i++) {
    await new Promise(r => setTimeout(r, i * 5000));
    openVideo(CONFIG.url, i);
  }
})();

// 🔹 Ctrl+C / Q para cerrar
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
