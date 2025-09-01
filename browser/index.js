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
const VIDEO_ID = process.env.VIDEO_ID || "Kl6dLJanhxw";
const CONFIG = {
  url: `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=tiny&controls=0&modestbranding=1`,
  //url: `https://youtube.com/watch?v=${VIDEO_ID}`,
  cantidad: VIEWS,
};

console.log(`🎯 Configuración: ${VIEWS} vistas para video ${VIDEO_ID}`);
console.log(`🔗 URL: ${CONFIG.url}`);

const browsers = [];

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

async function monitorBandwidth(page, index) {
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    let totalBytes = 0;
    const resourceBytes = {};

    // 🔹 Contar todos los bytes (video incluido)
    client.on('Network.loadingFinished', (event) => {
        totalBytes += event.encodedDataLength;
    });

    // 🔹 Contar bytes por tipo de recurso (aproximado)
    page.on("requestfinished", async (request) => {
        try {
            const response = request.response();
            if (!response) return;

            let type = request.resourceType(); // script, image, xhr, etc.

            // Forzar video/chunks de YouTube como "media"
            if (request.url().includes("googlevideo.com")) type = "media";

            const headers = response.headers();
            let length = parseInt(headers['content-length']) || 0;

            if (!resourceBytes[type]) resourceBytes[type] = 0;
            resourceBytes[type] += length;
        } catch (err) {
            // ignorar errores
        }
    });

    const interval = setInterval(() => {
        console.log(`\n📊 Instancia ${index + 1} - Consumo total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

        const sorted = Object.entries(resourceBytes).sort((a, b) => b[1] - a[1]);

        console.log(`📊 Consumo por tipo de recurso:`);
        if (sorted.length === 0) console.log("  Esperando datos...");
        for (const [type, bytes] of sorted) {
            console.log(`  ${type.padEnd(12)} : ${(bytes / 1024 / 1024).toFixed(2)} MB`);
        }
    }, 10000);

    return () => clearInterval(interval); // Para limpiar si cerramos la pestaña
}
  
async function openVideo(url, index) {
  try {
    const categories = ["desktop"]; // ["desktop", "mobile", "tablet"];
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
      userDataDir: "./cache_base", 
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
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 100,             // latencia simulada ms
      downloadThroughput: 100 * 1024, // 0.1MB
      uploadThroughput: 2000     // bytes/s
    });

    // 🔹 Interceptar requests
    let lastAllowedTime = 0;
    const INTERVAL = 10000; // 10 segundos

    await page.setRequestInterception(true);
    page.on("request", request => {
        const url = request.url();
        const now = Date.now();
        const blocked = ["image","font","other","imageset"];

        // Bloquear recursos no críticos
        if (blocked.includes(request.resourceType())) {
            return request.abort();
        }

        // Control de googlevideo
        if (url.includes("googlevideo.com")) {
            if (now - lastAllowedTime >= INTERVAL) {
                lastAllowedTime = now;
                //console.log(`✅ Permitido: ${url}`);
                console.log(`✅ Permitido`);
                return request.continue();
            } else {
                //console.log(`❌ Abortado: ${url}`);
                console.log(`❌ Abortado`);
                return request.abort();
            }
        }

        // Default: continuar
        request.continue();
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

    // 🔹 Iniciar monitoreo de ancho de banda
    const stopMonitoring = await monitorBandwidth(page, index);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
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