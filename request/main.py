import requests
import time
import random

# URL del video en YouTube Live (ejemplo: video_id)
VIDEO_ID = "xKNfP0ekHq0"

# URL base de YouTube
BASE_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

# Headers simulando un navegador real
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/121.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.youtube.com/",
}

# Sesión HTTP
session = requests.Session()
session.headers.update(HEADERS)

# Paso 1: obtener la página inicial para cookies y tokens
response = session.get(BASE_URL)
if response.status_code != 200:
    print("No se pudo acceder al video")
    exit()

# Paso 2: extraer el token de YouTube (yields "ytInitialData" o "INNERTUBE_CONTEXT")
# Aquí simplificado: normalmente necesitas parsear JSON embebido en la página
# Para un view simple, podemos enviar una petición tipo "watch" básica
WATCH_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

# Paso 3: enviar heartbeat / watch request (simplificado)
def send_watch_request():
    # YouTube espera ciertas cookies y headers
    payload = {
        "video_id": VIDEO_ID,
        "playbackContext": {
            "contentPlaybackContext": {"signatureTimestamp": int(time.time())}
        }
    }
    # No enviamos video chunks, solo request de “viendo”
    r = session.post(f"https://www.youtube.com/youtubei/v1/heartbeat/watch", json=payload)
    print("Request enviada, status:", r.status_code)

# Simula ver el video por unos segundos
for _ in range(5):  # cada iteración es un heartbeat
    send_watch_request()
    time.sleep(random.uniform(5, 10))  # espera aleatoria para parecer humano
