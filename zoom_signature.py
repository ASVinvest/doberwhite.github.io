# zoom_signature.py
# -----------------
# Servidor muy simple que genera la firma JWT para el Meeting SDK de Zoom

from flask import Flask, request, jsonify
import time
import jwt  # pyjwt

app = Flask(__name__)

# ⚠️ RELLENA ESTOS DOS CON TUS CREDENCIALES DEL APP EN ZOOM
#   - SDK_KEY    = Client ID de tu app (Meeting SDK / General app)
#   - SDK_SECRET = Client Secret de tu app
SDK_KEY = "H7CSfl3vTPWzVmudtpPSmA"
SDK_SECRET = "OLIsEjEdayl6AH7DYAwJ7R6nyoZuSQgU"


@app.post("/zoom-signature")
def zoom_signature():
    """Recibe meetingNumber y role, devuelve la firma JWT para Meeting SDK."""
    body = request.get_json(force=True) or {}
    meeting_number = str(body.get("meetingNumber", "")).strip()
    role = int(body.get("role", 0))  # 0 = participante, 1 = host

    if not meeting_number:
        return jsonify({"error": "meetingNumber requerido"}), 400

    # Tiempos en segundos
    iat = int(time.time()) - 30           # issued at (30s de margen)
    exp = iat + 60 * 60 * 2              # válido 2 horas
    token_exp = exp

    payload = {
        "sdkKey": SDK_KEY,
        "mn": meeting_number,
        "role": role,
        "iat": iat,
        "exp": exp,
        "appKey": SDK_KEY,
        "tokenExp": token_exp,
    }

    token = jwt.encode(payload, SDK_SECRET, algorithm="HS256")
    # Compatibilidad pyjwt < 2 (devuelve bytes)
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({"signature": token})


if __name__ == "__main__":
    # Lanza el servidor local en http://localhost:5000
    app.run(host="0.0.0.0", port=5000, debug=True)
