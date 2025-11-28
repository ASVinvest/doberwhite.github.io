#!/usr/bin/env python3
# zoom_signature.py
# Mini API que genera la firma JWT para el Zoom Meeting SDK

import time
from flask import Flask, request, jsonify
import jwt  # pip install pyjwt

# PON AQUÍ tus credenciales de la app Zoom (NO en el frontend)
SDK_KEY = "H7CSfl3vTPWzVmudtpPSmA"
SDK_SECRET = "OLIsEjEdayl6AH7DYAwJ7R6nyoZuSQgU"

app = Flask(__name__)


@app.post("/zoom-signature")
def zoom_signature():
    data = request.get_json() or {}
    meeting_number = str(data.get("858 6535 0255", "")).strip()
    role = int(data.get("role", 0))  # 0 = participante, 1 = host

    if not meeting_number:
        return jsonify({"error": ""}), 400

    if not SDK_KEY or not SDK_SECRET:
        return jsonify({"error": "SDK_KEY/SDK_SECRET no configurados"}), 500

    # tiempos en segundos
    iat = int(time.time()) - 30
    exp = iat + 60 * 60 * 2  # 2 horas

    payload = {
        "sdkKey": SDK_KEY,
        "mn": meeting_number,
        "role": role,
        "iat": iat,
        "exp": exp,
        "tokenExp": exp,
    }

    signature = jwt.encode(payload, SDK_SECRET, algorithm="HS256")

    return jsonify({"signature": signature})


if __name__ == "__main__":
    # http://localhost:5000/zoom-signature
    app.run(host="0.0.0.0", port=5000, debug=True)
