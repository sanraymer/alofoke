#!/bin/bash

echo "🚀 Iniciando contenedor..."

check_tor() {
    curl --socks5 localhost:9050 --socks5-hostname localhost:9050 -s https://check.torproject.org/ | grep -q "Congratulations"
}

MAX_RETRIES=15
RETRY_DELAY=5

while true; do
    echo "🛡️  Iniciando Tor..."
    tor -f /etc/tor/torrc &
    TOR_PID=$!

    attempt=1
    echo "⏳ Esperando a que Tor esté listo..."
    while ! check_tor; do
        if [ $attempt -gt $MAX_RETRIES ]; then
            echo "⚠️ Tor no respondió, reiniciando Tor..."
            kill $TOR_PID 2>/dev/null
            sleep 2
            break  # Sale del while interno para relanzar Tor
        fi
        echo "⏳ Tor aún no listo, intento $attempt/$MAX_RETRIES..."
        attempt=$((attempt + 1))
        sleep $RETRY_DELAY
    done

    if check_tor; then
        echo "✅ Tor está funcionando correctamente"
        break
    fi
done

sleep 5
echo "📱 Iniciando aplicación Node.js..."
exec node lite.js
