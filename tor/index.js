import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import readline from "readline";
import { faker } from "@faker-js/faker";
import TorControl from "tor-control";
import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain';
import { EventEmitter } from 'events';

// 🔹 Evitar MaxListenersExceededWarning por alto recambio de sockets/instancias
EventEmitter.defaultMaxListeners = 1000;

// 🔹 Inicializar puppeteer-extra con stealth
puppeteerExtra.use(stealthPlugin());
const puppeteer = puppeteerExtra;

// 🔹 Configuración video desde variables de entorno
const VIEWS = parseInt(process.env.VIEWS) || 3;
const VIDEO_ID = process.env.VIDEO_ID || "DaoxoYGuks4";
const CONFIG = {
  url: `https://www.youtube.com/embed/${VIDEO_ID}?mute=1&rel=0&vq=small`,
  cantidad: VIEWS,
};

// Log de configuración
console.log(`🎯 Configuración: ${VIEWS} vistas para video ${VIDEO_ID}`);
console.log(`🔗 URL: ${CONFIG.url}`);

// 🔹 Control de Tor para rotar IP
const tor = new TorControl({
  host: "127.0.0.1",
  port: 9051,
  password: "", // usar CookieAuthentication o dejar vacío
});

let torLock = false;

async function acquireTorLock() {
  while (torLock) {
    await new Promise(r => setTimeout(r, 500)); // espera 0.5s si alguien más usa Tor
  }
  torLock = true;
}

function releaseTorLock() {
  torLock = false;
}

async function newTorIdentity() {
  await acquireTorLock(); // espera hasta que Tor esté libre
  try {
    const maxRetries = 3;
    const timeoutMs = 15000; // 15s timeout

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Promise.race([
          new Promise((resolve, reject) => {
            tor.signalNewnym((err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tor timeout')), timeoutMs))
        ]);
        // 🔹 Después de NEWNYM, esperar 10s mínimo antes de permitir otro cambio
        await new Promise(r => setTimeout(r, 10000));
        return;
      } catch (error) {
        console.log(`⚠️ Intento ${attempt}/${maxRetries} de Tor falló: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random()*3000)));
      }
    }
  } finally {
    releaseTorLock(); // liberar Tor para otras instancias
  }
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
    // 🔹 Espera aleatoria 10–20s para que Tor aplique nueva identidad (evitar rate limiting)
    await new Promise(r => setTimeout(r, 10000 + Math.floor(Math.random()*10000)));

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
    let httpProxyUrl;
    let retryCount = 0;
    const maxProxyRetries = 3;

    while (retryCount < maxProxyRetries) {
      try {
        const username = `iso_${index}_${Date.now()}`;
        const forwardUsername = encodeURIComponent(username);
        const socksUpstream = `socks5h://${forwardUsername}:x@127.0.0.1:9050`;
        httpProxyUrl = await anonymizeProxy(socksUpstream);
        console.log(`🛡️  Instancia ${index + 1}: HTTP proxy local en ${httpProxyUrl}`);
        break; // Éxito, salir del bucle
      } catch (error) {
        retryCount++;
        console.log(`⚠️ Instancia ${index + 1}: Proxy falló (${retryCount}/${maxProxyRetries}): ${error.message}`);

        if (retryCount >= maxProxyRetries) {
          throw new Error(`Proxy falló después de ${maxProxyRetries} intentos: ${error.message}`);
        }

        // Esperar antes del siguiente intento (delay progresivo)
        const delayMs = 5000 + (retryCount * 10000) + Math.floor(Math.random()*10000);
        console.log(`⏳ Instancia ${index + 1}: Esperando ${Math.round(delayMs/1000)}s antes de reintentar...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    const browser = await puppeteer.launch({
      headless: true,
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
    // 🔹 Cabeceras realistas para embed (coherentes con YouTube)
    await page.setExtraHTTPHeaders({
      'Accept-Language': `${locale},${lang};q=0.9`,
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com'
    });

    let devtools;
    try {
      devtools = await page.target().createCDPSession();
      await devtools.send('Emulation.setLocaleOverride', { locale });
      await devtools.send('Emulation.setTimezoneOverride', { timezoneId: timezone });
    } catch {}

    await page.setViewport({
      width: 320 + Math.floor(Math.random() * 20),
      height: 180 + Math.floor(Math.random() * 10),
    });

    // Observadores/handlers Node-side (se eliminarán con removeAllListeners/cleanup)
    const onResponse = async (response) => {
      if (response.status() >= 400) {
        console.log(`⚠️ Instancia ${index + 1} recibió error HTTP ${response.status()}`);
      }
    };
    const onError = (err) => console.log(`⚠️ Instancia ${index + 1} error: ${err.message}`);
    const onPageError = (err) => console.log(`⚠️ Instancia ${index + 1} pageerror: ${err.message}`);

    page.on("response", onResponse);
    page.on("error", onError);
    page.on("pageerror", onPageError);

    browsers.push(browser);

    // 🔹 Reinicio controlado por tiempo o por detección de bot-check
    let restarted = false;
    // 🔹 Guardar referencias para limpieza
    let restartTimer;
    let pollBotCheck;
    let microInterval;

    // Función robusta de limpieza que:
    // - limpia timers/intervals node-side
    // - remueve listeners de page/browser
    // - desconecta devtools CDP si existe
    // - solicita al contexto de la página desconectar MutationObserver y handlers in-page
    const cleanup = async () => {
      try { if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; } } catch {}
      try { if (pollBotCheck) { clearInterval(pollBotCheck); pollBotCheck = null; } } catch {}
      try { if (microInterval) { clearInterval(microInterval); microInterval = null; } } catch {}

      // 1) Intentar ejecutar la limpieza dentro de la página (remover observer y handlers añadidos en page.evaluate)
      try {
        // Si la página aún está disponible, pedirle que ejecute su cleanup in-page
        await page.evaluate(() => {
          try {
            if (window.__yt_cleanup && typeof window.__yt_cleanup === 'function') {
              window.__yt_cleanup();
            } else {
              // fallback: intentar desconectar elementos concretos
              if (window.__yt_observer && typeof window.__yt_observer.disconnect === 'function') {
                window.__yt_observer.disconnect();
                window.__yt_observer = null;
              }
              if (window.__yt_pause_handler) {
                const v = document.querySelector('video');
                if (v && typeof window.__yt_pause_handler === 'function') {
                  v.removeEventListener('pause', window.__yt_pause_handler);
                }
                window.__yt_pause_handler = null;
              }
            }
          } catch (e) {
            // swallow — la página puede estar en proceso de cierre
          }
        }).catch(() => {});
      } catch {}

      // 2) Remover listeners Node-side del page y del browser
      try { page.removeListener("response", onResponse); } catch {}
      try { page.removeListener("error", onError); } catch {}
      try { page.removeListener("pageerror", onPageError); } catch {}
      try { if (page.removeAllListeners) page.removeAllListeners(); } catch {}
      try { if (browser.removeAllListeners) browser.removeAllListeners(); } catch {}

      // 3) Detach devtools CDP si se creó
      try {
        if (devtools && typeof devtools.detach === 'function') {
          await devtools.detach().catch(() => {});
          devtools = null;
        }
      } catch {}

      // 4) Asegurar que no queden micro-intervals atados a eventos de 'close'
      try {
        page.removeAllListeners('close');
      } catch {}
    };

    const removeBrowserFromList = () => {
      const idx = browsers.indexOf(browser);
      if (idx !== -1) browsers.splice(idx, 1);
    };

    const handleRestart = async (reason) => {
      if (restarted) return;
      restarted = true;
      console.log(`🔄 Instancia ${index + 1}: reinicio por ${reason}`);
      await cleanup();
      try { await browser.close(); } catch {}
      try { await closeAnonymizedProxy(httpProxyUrl, true); } catch {}
      removeBrowserFromList();
      try {
        await newTorIdentity();
        await new Promise(r => setTimeout(r, 10000 + Math.floor(Math.random()*10000)));
      } catch {}
      openVideo(url, index);
    };

    // 🔹 Validación de proxy/IP antes de ir a YouTube
    try {
      const ipResult = await page.evaluate(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal, cache: 'no-store' });
          const data = await res.json();
          return data && data.ip ? data.ip : null;
        } catch (e) {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      });
      if (!ipResult) {
        await handleRestart('fallo validación de proxy/IP');
        return;
      } else {
        console.log(`🌐 Instancia ${index + 1} IP saliente: ${ipResult}`);
      }
    } catch {
      await handleRestart('excepción validando proxy/IP');
      return;
    }

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
      microInterval = setInterval(async () => {
        try { await moveMouseRandom(); } catch {}
      }, 3000 + Math.floor(Math.random()*4000));
      // Detener el interval al cerrar la página (stopMicro) — además cleanup borra el interval
      const stopMicro = () => { if (microInterval) { clearInterval(microInterval); microInterval = null; } };
      page.on('close', stopMicro);
    } catch {}

    // 🔹 Inyectar handlers en la página pero con referencias globales en window
    // Esto nos permite pedir explícitamente la desconexión desde Node usando page.evaluate
    await page.evaluate(() => {
      try {
        // handler de pausa
        const vid = document.querySelector("video");
        if (vid) {
          window.__yt_pause_handler = function() { vid.play().catch(()=>{}); };
          vid.muted = true;
          vid.play().catch(()=>{});
          vid.addEventListener("pause", window.__yt_pause_handler);
        }

        // MutationObserver para detectar y clickear "skip ad"
        window.__yt_observer = new MutationObserver(() => {
          try {
            const skipBtn = document.querySelector(".ytp-ad-skip-button.ytp-button");
            if (skipBtn) skipBtn.click();
          } catch {}
        });
        window.__yt_observer.observe(document.body, { childList: true, subtree: true });

        // Función de limpieza in-page
        window.__yt_cleanup = function() {
          try {
            if (window.__yt_observer && typeof window.__yt_observer.disconnect === 'function') {
              window.__yt_observer.disconnect();
              window.__yt_observer = null;
            }
          } catch (e) {}
          try {
            const v = document.querySelector("video");
            if (v && window.__yt_pause_handler) {
              v.removeEventListener("pause", window.__yt_pause_handler);
            }
            window.__yt_pause_handler = null;
          } catch (e) {}
        };
      } catch (e) {
        // swallow
      }
    });

    const watchMs = 300000 + Math.floor(Math.random()*60000); // 300–360s
    restartTimer = setTimeout(async () => {
      if (restarted) return;
      console.log(`⏱ ${Math.round(watchMs/1000)} segundos cumplidos, cerrando y reiniciando instancia ${index + 1}`);
      await cleanup();
      try { await browser.close(); } catch {}
      try { await closeAnonymizedProxy(httpProxyUrl, true); } catch {}
      removeBrowserFromList();
      openVideo(url, index); // 🔹 reinicia con nueva IP
    }, watchMs);

    // 🔹 Detector de pantalla de error/bot-check por selector de YouTube (independiente del idioma)
    const errorSelector = ".ytp-error, .ytp-error-content-wrap";
    pollBotCheck = setInterval(async () => {
      if (restarted) { clearInterval(pollBotCheck); pollBotCheck = null; return; }
      try {
        const found = await page.evaluate((sel) => {
          return Boolean(document.querySelector(sel));
        }, errorSelector);
        if (found) {
          await cleanup();
          await handleRestart("YouTube error/bot-check");
        }
      } catch {}
    }, 3000);

  } catch (err) {
    console.error(`Error en instancia ${index + 1}: ${err.message}`);
  }
}

for (let i = 0; i < CONFIG.cantidad; i++) {
  setTimeout(() => openVideo(CONFIG.url, i), i * (15000 + Math.floor(Math.random()*5000))); // 15–20s entre lanzamientos
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
