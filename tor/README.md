# Alofoke - YouTube Views con Tor
Aplicación para generar vistas de YouTube usando múltiples instancias de Tor para rotación de IPs.

docker ps
docker image

# Limpiar todo lo detenido 
docker system prune -a

# Dockerfile
docker build -t alofoke-app .

docker run -d --name alofoke-1 \
  -p 9050:9050 -p 9051:9051 \
  -e VIDEO_ID="fIUr0bJbaAg" \
  -e VIEWS=50 \
  alofoke-app

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
docker restart alofoke-container

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

