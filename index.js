import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import readline from "readline";
import { faker } from "@faker-js/faker";
import TorControl from "tor-control";
import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain';

// 🔹 Inicializar puppeteer-extra con stealth
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Configuración video
const VIEWS = 5;
const VIDEO_ID = "mwmjhQwkAno";
const CONFIG = { 
  url: `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`,
  cantidad: VIEWS,
};

// 🔹 Control de Tor para rotar IP
const tor = new TorControl({
  host: "127.0.0.1",
  port: 9051,
  password: "", // usar CookieAuthentication o dejar vacío
});

async function newTorIdentity() {
  return new Promise((resolve, reject) => {
    tor.signalNewnym((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

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
    // 🔹 Solicitar nueva IP Tor
    await newTorIdentity();
    await new Promise(r => setTimeout(r, 5000)); // esperar 5s para que la IP se cambie

    const userAgent = new UserAgent({ deviceCategory: "desktop" }).toString();
    // 🔹 Locale y timezone aleatorios con @faker-js/faker (cientos de combinaciones)
    const languageCodes = [
      "af","ar","az","be","bg","bn","bs","ca","cs","cy","da","de","el","en","es","et","eu","fa","fi","fr","ga","gl","gu","he","hi","hr","hu","hy","id","is","it","ja","ka","kk","km","kn","ko","lt","lv","mk","ml","mn","mr","ms","nb","ne","nl","nn","pa","pl","pt","ro","ru","si","sk","sl","sq","sr","sv","ta","te","th","tr","uk","ur","vi","zh"
    ];
    const lang = faker.helpers.arrayElement(languageCodes);
    const country = faker.location.countryCode("alpha-2");
    const locale = `${lang}-${country}`;
    const timezone = faker.location.timeZone();

    // 🔹 Crear proxy HTTP local (anonymizeProxy) que reenvía al SOCKS de Tor con credenciales únicas
    const username = `iso_${index}_${Date.now()}`;
    const forwardUsername = encodeURIComponent(username);
    const socksUpstream = `socks5h://${forwardUsername}:x@127.0.0.1:9050`;
    const httpProxyUrl = await anonymizeProxy(socksUpstream);
    console.log(`🛡️  Instancia ${index + 1}: HTTP proxy local en ${httpProxyUrl}`);

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
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        // 🔹 Usar proxy HTTP local que reenvía al SOCKS de Tor con credenciales únicas
        `--proxy-server=${httpProxyUrl}`,
        // 🔹 Evitar listas de bypass que puedan causar ERR_NO_SUPPORTED_PROXIES con HTTPS
        `--proxy-bypass-list=`,
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({ 'Accept-Language': `${locale},${lang};q=0.9` });
    try {
      const devtools = await page.target().createCDPSession();
      await devtools.send('Emulation.setLocaleOverride', { locale });
      await devtools.send('Emulation.setTimezoneOverride', { timezoneId: timezone });
    } catch {}

    await page.setViewport({
      width: 320 + Math.floor(Math.random() * 20),
      height: 180 + Math.floor(Math.random() * 10),
    });

    // 🔹 Bloquear solo recursos no críticos (permitir scripts y media para YouTube)
    // Delata que es un bot, mejor abrir un embebido que no tiene muchos recursos no necesarios.
    /*await page.setRequestInterception(true);
    page.on("request", req => {
      const blocked = ["image", "stylesheet", "font"];
      if(blocked.includes(req.resourceType())) req.abort();
      else req.continue();
    });*/

    // Cookies
    // No son necesarias injectarlas porque delata que es un bot, mejor que Youtube genere las suyas
    /*const client = await page.target().createCDPSession();
    const cookies = [
      { name: "session_id", value: faker.datatype.uuid(), domain: ".youtube.com", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
      { name: "user_token", value: faker.internet.userName(), domain: ".youtube.com", path: "/" },
      { name: "visitor_id", value: faker.datatype.number({ min: 1000000, max: 9999999 }).toString(), domain: ".youtube.com", path: "/" },
      { name: "location", value: faker.address.country(), domain: ".youtube.com", path: "/" },
    ];
    await client.send("Network.setCookies", { cookies });*/

    page.on("response", async (response) => {
      if (response.status() >= 400) {
        console.log(`⚠️ Instancia ${index + 1} recibió error HTTP ${response.status()}`);
      }
    });

    page.on("error", (err) => console.log(`⚠️ Instancia ${index + 1} error: ${err.message}`));
    page.on("pageerror", (err) => console.log(`⚠️ Instancia ${index + 1} pageerror: ${err.message}`));

    browsers.push(browser);

    // 🔹 Reinicio controlado por tiempo o por detección de bot-check
    let restarted = false;
    const handleRestart = async (reason) => {
      if (restarted) return;
      restarted = true;
      console.log(`🔄 Instancia ${index + 1}: reinicio por ${reason}`);
      try { await browser.close(); } catch {}
      try { await closeAnonymizedProxy(httpProxyUrl, true); } catch {}
      try {
        await newTorIdentity();
        await new Promise(r => setTimeout(r, 5000));
      } catch {}
      openVideo(url, index);
    };

    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await clickLargePlayButton(page);

    // 🔹 Micro-interacciones humanas
    try {
      await page.bringToFront();
      const jitter = () => 200 + Math.floor(Math.random()*1000);
      const moveMouseRandom = async () => {
        const x = 50 + Math.floor(Math.random()*220);
        const y = 40 + Math.floor(Math.random()*120);
        await page.mouse.move(x, y, { steps: 10 });
      };
      const clickNearCenter = async () => {
        const x = 160 + Math.floor(Math.random()*20) - 10;
        const y = 90 + Math.floor(Math.random()*10) - 5;
        await page.mouse.click(x, y, { delay: 20 + Math.floor(Math.random()*80) });
      };
      const doScroll = async () => {
        await page.mouse.wheel({ deltaY: Math.floor(Math.random()*50) });
      };
      // Secuencia ligera y repetición esporádica
      setTimeout(moveMouseRandom, jitter());
      setTimeout(clickNearCenter, jitter()+600);
      setTimeout(doScroll, jitter()+1200);
      const microInterval = setInterval(async () => {
        try { await moveMouseRandom(); } catch {}
      }, 3000 + Math.floor(Math.random()*4000));
      // Detener el interval al reiniciar
      const stopMicro = () => clearInterval(microInterval);
      page.on('close', stopMicro);
    } catch {}

    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) {
        video.muted = true;
        video.play().catch(() => {});
        video.addEventListener("pause", () => video.play());
      }

      const observer = new MutationObserver(() => {
        const skipBtn = document.querySelector(".ytp-ad-skip-button.ytp-button");
        if (skipBtn) skipBtn.click();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    const restartTimer = setTimeout(async () => {
      if (restarted) return;
      console.log(`⏱ 50 segundos cumplidos, cerrando y reiniciando instancia ${index + 1}`);
      try { await browser.close(); } catch {}
      try { await closeAnonymizedProxy(httpProxyUrl, true); } catch {}
      openVideo(url, index); // 🔹 reinicia con nueva IP
    }, 50000);

    // 🔹 Detector de pantalla de error/bot-check por selector de YouTube (independiente del idioma)
    const errorSelector = ".ytp-error, .ytp-error-content-wrap";
    const pollBotCheck = setInterval(async () => {
      if (restarted) { clearInterval(pollBotCheck); return; }
      try {
        const found = await page.evaluate((sel) => {
          return Boolean(document.querySelector(sel));
        }, errorSelector);
        if (found) {
          clearInterval(pollBotCheck);
          clearTimeout(restartTimer);
          await handleRestart("YouTube error/bot-check");
        }
      } catch {}
    }, 3000);

  } catch (err) {
    console.error(`Error en instancia ${index + 1}: ${err.message}`);
  }
}

for (let i = 0; i < CONFIG.cantidad; i++) {
  setTimeout(() => openVideo(CONFIG.url, i), i * 5000);
}

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