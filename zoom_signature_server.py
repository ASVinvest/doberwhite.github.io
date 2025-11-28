#!/usr/bin/env python3
# zoom_signature_server.py
# Mini API que genera la firma JWT para el Zoom Meeting SDK

import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt  # PyJWT

app = Flask(__name__)
CORS(app)

# PON AQUÍ tus credenciales del Meeting SDK
SDK_KEY = os.environ.get("ZOOM_MEETING_SDK_KEY", "TU_SDK_KEY_AQUI")
SDK_SECRET = os.environ.get("ZOOM_MEETING_SDK_SECRET", "TU_SDK_SECRET_AQUI")


@app.post("/zoom-signature")
def zoom_signature():
    data = request.get_json(force=True) or {}
    meeting_number = str(data.get("meetingNumber", "")).strip()
    role = int(data.get("role", 0))  # 0 = participante, 1 = host

    if not meeting_number:
        return jsonify({"error": "meetingNumber requerido"}), 400

    iat = int(time.time())
    exp = iat + 60 * 60 * 2  # 2 horas

    payload = {
        "sdkKey": SDK_KEY,
        "mn": meeting_number,
        "role": role,
        "iat": iat,
        "exp": exp,
        "tokenExp": exp,
    }

    token = jwt.encode(
        payload,
        SDK_SECRET,
        algorithm="HS256",
        headers={"alg": "HS256", "typ": "JWT"},
    )

    return jsonify({"signature": token, "sdkKey": SDK_KEY})


if __name__ == "__main__":
    # En producción puedes quitar debug=True
    app.run(host="0.0.0.0", port=4000, debug=True)
