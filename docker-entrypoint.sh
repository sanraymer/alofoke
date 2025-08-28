#!/bin/bash

# Script de entrada para Docker
echo "🚀 Iniciando contenedor..."

# Iniciar Tor en background
echo "🛡️  Iniciando Tor..."
tor -f /etc/tor/torrc &
TOR_PID=$!

# Esperar a que Tor esté listo
echo "⏳ Esperando a que Tor esté listo..."
sleep 10

# Verificar que Tor esté funcionando
echo "🔍 Verificando estado de Tor..."
if ! curl --socks5 localhost:9050 --socks5-hostname localhost:9050 -s https://check.torproject.org/ | grep -q "Congratulations"; then
    echo "❌ Tor no está funcionando correctamente"
    exit 1
fi

echo "✅ Tor está funcionando correctamente"

# Esperar un poco más para que Tor esté completamente estable
sleep 5

# Ejecutar la aplicación Node.js
echo "📱 Iniciando aplicación Node.js..."
exec node index.js
