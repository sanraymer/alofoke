# Alofoke - YouTube Views con Tor
Aplicación para generar vistas de YouTube usando múltiples instancias de Tor para rotación de IPs.

docker ps
docker image

# Stop all 
docker stop $(docker ps -q)

# Remove all
docker system prune -a

# Limpiar todo lo detenido 
docker stop alofoke-1 && docker rm -f alofoke-1 && docker stop alofoke-2 && docker rm -f alofoke-2 && docker stop alofoke-3 && docker rm -f alofoke-3 && docker stop alofoke-4 && docker rm -f alofoke-4 && docker stop alofoke-5 && docker rm -f alofoke-5 && docker stop alofoke-6 && docker rm -f alofoke-6 && docker stop alofoke-7 && docker rm -f alofoke-7 && docker stop alofoke-8 && docker rm -f alofoke-8 && docker stop alofoke-9 && docker rm -f alofoke-9 && docker stop alofoke-10 && docker rm -f alofoke-10

# Dockerfile
docker build -t alofoke-app .

docker run -d --name alofoke-1 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-2 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-3 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-4 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-5 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-6 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-7 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-8 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-9 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-10 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-11 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-12 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-13 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-14 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app
docker run -d --name alofoke-15 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=20 alofoke-app


docker run -d --name alofoke-22 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=10 alofoke-app


docker rm -f alofoke-9 && docker run -d --name alofoke-9 -e VIDEO_ID="AFLLSq8t16k" -e VIEWS=100 alofoke-app


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
docker restart alofoke-1

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

