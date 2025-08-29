Bugs:

Cerrar tab unicamente cuando se detecta un bot no todo el navegador


raymer@Raymers-MacBook-Pro tor % node lite.js
⏳ Preparando ventana 1...
⏳ Preparando ventana 2...
⏳ Preparando ventana 3...
⏳ Preparando ventana 4...
🎬 Todas las ventanas abiertas. Live streaming activo.
✅ Ventana 1 abierta con IP Tor única: iso_0_1756457029469
🔄 Reiniciando ventana 1 por YouTube error/bot-check
⏳ Preparando ventana 1...
✅ Ventana 2 abierta con IP Tor única: iso_1_1756457044535
/Users/raymer/Desktop/alofoke/node_modules/@puppeteer/browsers/lib/cjs/launch.js:325
                reject(new Error([
                       ^

Error: Failed to launch the browser process! undefined
[99406:1035221:0829/044419.667271:ERROR:chrome/browser/process_singleton_posix.cc:340] Failed to create /private/tmp/puppeteer_profile_2/SingletonLock: File exists (17)
[99406:1035221:0829/044419.667496:ERROR:chrome/app/chrome_main_delegate.cc:529] Failed to create a ProcessSingleton for your profile directory. This means that running multiple instances would start multiple browser processes rather than opening a new window in the existing process. Aborting now to avoid profile corruption.


TROUBLESHOOTING: https://pptr.dev/troubleshooting

    at ChildProcess.onClose (/Users/raymer/Desktop/alofoke/node_modules/@puppeteer/browsers/lib/cjs/launch.js:325:24)
    at ChildProcess.emit (node:events:530:35)
    at ChildProcess._handle.onexit (node:internal/child_process:293:12)

Node.js v22.17.0





# Alofoke - YouTube Views con Tor
Aplicación para generar vistas de YouTube usando múltiples instancias de Tor para rotación de IPs.

docker ps
docker image

# Limpiar todo lo detenido 
docker system prune -a

# Dockerfile
docker build -t alofoke-app .


docker run -d --name alofoke-1 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-2 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-3 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-4 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-5 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-6 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-7 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-8 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-9 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app
docker run -d --name alofoke-10 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app


docker rm -f alofoke-9 && docker run -d --name alofoke-9 -e VIDEO_ID="KAApNx6OOKM" -e VIEWS=100 alofoke-app


# Docker Compose
docker-compose up -d

## Comandos
# Ver logs en tiempo real
docker logs -f alofoke-1

# Ver logs de las últimas 100 líneas
docker logs --tail=100 alofoke-1

# Detener el contenedor
docker stop alofoke-1

# Iniciar el contenedor
docker start alofoke-1

# Reiniciar el contenedor
a

# Eliminar el contenedor
docker rm alofoke-1

# Ver estadísticas del contenedor
docker stats alofoke-1

## 🖥️ Instalación local (Alternativa)
### Instalación Tor (macOS)
```bash
brew install tor
brew services start tor

// Correr con este:
tor -f ~/tor_config/torrc
```

### Configuración Tor
Crear `~/tor_config/torrc`:
```
SocksPort 9050
IsolateSOCKSAuth
ControlPort 9051
CookieAuthentication 0
```

### Instalación aplicación
```bash
npm install
node index.js
```

