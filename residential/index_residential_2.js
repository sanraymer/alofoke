import puppeteer from "puppeteer";
import UserAgent from "user-agents";
import readline from "readline";

const PROXIES = [
  { host: "pr.oxylabs.io", port: "7777", username: "customer-alofoke_nC7yb-cc-US", password: "zph5DYP1nqb1dub_udu" },
];

const CONFIG = {
  url: "https://www.youtube.com/embed/pAE6J49NT8E?mute=1&rel=0&vq=small",
  cantidad: 1,
};

const browsers = [];

// Click seguro en el botón grande de Play
const clickLargePlayButton = async (page) => {
  try {
    await page.waitForSelector(".ytp-large-play-button.ytp-button", { timeout: 10000 });
    const btn = await page.$(".ytp-large-play-button.ytp-button");
    if (btn) {
      await btn.click();
      console.log("✅ Click inicial en Play realizado");
    }
  } catch {
    console.log("⚠️ No se encontró el botón de Play o ya estaba en reproducción");
  }
};

async function openVideo(url, index) {
  try {
    const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();
    const proxy = PROXIES[index % PROXIES.length];

    console.log(`Instancia ${index + 1} - UA: ${userAgent} - Proxy: ${proxy.host}:${proxy.port}`);

    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--user-agent=${userAgent}`,
        //`--proxy-server=http://${proxy.host}:${proxy.port}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--mute-audio",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
      ],
    });

    const page = await browser.newPage();
    //await page.authenticate({ username: proxy.username, password: proxy.password });
    await page.setUserAgent(userAgent);

    await page.setViewport({
      width: 800 + Math.floor(Math.random() * 400),
      height: 600 + Math.floor(Math.random() * 300),
    });

    // 🔹 Bloquear recursos innecesarios para ahorrar ancho de banda
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const blockedResources = ["image", "font", "media"]; // stylesheet
      if (blockedResources.includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 🔹 Manejo de errores
    page.on("response", async (response) => {
      if (response.status() >= 400) {
        console.log(`⚠️ Instancia ${index + 1} recibió error HTTP ${response.status()}`);
      }
    });

    page.on("error", (err) => console.log(`⚠️ Instancia ${index + 1} error: ${err.message}`));
    page.on("pageerror", (err) => console.log(`⚠️ Instancia ${index + 1} pageerror: ${err.message}`));

    browsers.push(browser);

    // Ir a la página
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Click inicial en Play
    await clickLargePlayButton(page);

    // 🔹 Mute y reproducir video con eventos en lugar de setInterval
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) {
        video.muted = true; // sin audio
        video.play().catch(() => {});
        video.addEventListener("pause", () => video.play());
      }

      // Omitir anuncios automáticos
      const observer = new MutationObserver(() => {
        const skipBtn = document.querySelector(".ytp-ad-skip-button.ytp-button");
        if (skipBtn) skipBtn.click();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // 🔹 Cerrar y reiniciar la instancia tras 60 segundos
    setTimeout(async () => {
      console.log(`⏱ 40 segundos cumplidos, cerrando y reiniciando instancia ${index + 1}`);
      try { await browser.close(); } catch {}
      openVideo(url, index); // vuelve a abrir la misma instancia
    }, 40000); // 40 segundos

  } catch (err) {
    console.error(`Error en instancia ${index + 1}: ${err.message}`);
  }
}

// Abrir instancias escalonadas
for (let i = 0; i < CONFIG.cantidad; i++) {
  setTimeout(() => openVideo(CONFIG.url, i), i * 5000);
}

// Cerrar instancias con "q" + Enter
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on("line", async (input) => {
  if (input.toLowerCase() === "q") {
    console.log("Cerrando todas las instancias...");
    for (const browser of browsers) {
      try { await browser.close(); } catch {}
    }
    process.exit(0);
  }
});