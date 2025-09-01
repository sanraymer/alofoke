import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function precacheYouTube() {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./cache/cache_base", // Carpeta donde guardamos caché
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  // Para el embebido cacher ese de watch, de lo contrario no se cache el emebebido, por ser iframe
  await page.goto(
    "https://youtube.com/watch?v=Kl6dLJanhxw",
    { waitUntil: "domcontentloaded" }
  );

  console.log("✅ YouTube cargado, recursos cacheados en ./cache_base");

  // Espera un poco para que se descarguen JS/CSS
  await sleep(5000);

  await browser.close();
}

precacheYouTube();
