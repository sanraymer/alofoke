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
  -e VIDEO_ID="41i4d1JbrQg" \
  -e VIEWS=20 \
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

### Prerrequisitos
- Node.js 18+
- Tor

### Instalación Tor (macOS)
```bash
brew install tor
brew services start tor
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

## ⚙️ Configuración

### Variables principales en `index.js`
- `VIEWS`: Número de instancias simultáneas (recomendado: 8-10)
- `VIDEO_ID`: ID del video de YouTube
- `watchMs`: Tiempo de visionado (120-180s recomendado)


### Estadísticas del contenedor
```bash
docker stats alofoke-app
```

## 🛠️ Troubleshooting

### Tor no inicia
```bash
docker-compose down
docker volume rm alofoke_tor-data
docker-compose up --build
```

### Problemas de memoria
Ajustar límites en `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 4G  # Aumentar si es necesario
```

### Logs detallados
```bash
docker-compose logs -f --tail=100
```