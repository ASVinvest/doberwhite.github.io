from flask import Flask, request, jsonify
import time
import jwt  # pip install pyjwt

app = Flask(__name__)

# ⚠️ RELLENA ESTOS DOS CON LOS VALORES DE APP CREDENTIALS
SDK_KEY = "PEGA_AQUI_TU_CLIENT_ID_COMPLETO"       # ej: H7CSI3vTPW2Vm......
SDK_SECRET = "PEGA_AQUI_TU_CLIENT_SECRET_COMPLETO"

@app.post("/zoom-signature")
def zoom_signature():
    data = request.get_json() or {}
    meeting_number = data.get("meetingNumber")
    role = int(data.get("role", 0))

    iat = int(time.time()) - 30
    exp = iat + 60 * 60  # 1 hora de validez

    payload = {
        "sdkKey": SDK_KEY,
        "mn": meeting_number,
        "role": role,
        "iat": iat,
        "exp": exp,
        "tokenExp": exp,
    }

    token = jwt.encode(payload, SDK_SECRET, algorithm="HS256")

    resp = jsonify({"signature": token})
    # CORS: permite que lo llame tu dominio
    resp.headers["Access-Control-Allow-Origin"] = "https://www.doberwhite.com"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
