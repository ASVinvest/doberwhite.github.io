# zoom_signature.py
import os
import time

from flask import Flask, request, jsonify
import jwt  # pip install pyjwt

SDK_KEY = os.environ.get("ZOOM_SDK_KEY")
SDK_SECRET = os.environ.get("ZOOM_SDK_SECRET")

app = Flask(__name__)


@app.post("/zoom-signature")
def zoom_signature():
    data = request.get_json() or {}
    meeting_number = str(data.get("meetingNumber"))
    role = int(data.get("role", 0))  # 0 = asistente, 1 = host

    if not meeting_number or not SDK_KEY or not SDK_SECRET:
        return jsonify({"error": "config incompleta"}), 400

    iat = int(time.time()) - 30
    exp = iat + 60 * 60 * 2   # 2 horas
    token_exp = exp

    payload = {
        "sdkKey": SDK_KEY,
        "mn": meeting_number,
        "role": role,
        "iat": iat,
        "exp": exp,
        "tokenExp": token_exp,
    }

    signature = jwt.encode(payload, SDK_SECRET, algorithm="HS256")

    return jsonify({"signature": signature})


if __name__ == "__main__":
    # export ZOOM_SDK_KEY="TU_CLIENT_ID"
    # export ZOOM_SDK_SECRET="TU_CLIENT_SECRET"
    app.run(host="0.0.0.0", port=5000, debug=True)
