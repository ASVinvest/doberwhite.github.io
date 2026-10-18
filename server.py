import requests
from flask import Flask, request
from playwright.sync_api import sync_playwright

app = Flask(__name__)

# CONFIGURACIÓN TELEGRAM
TELEGRAM_TOKEN = "TU_BOT_TOKEN_DE_BOTFATHER"
CHAT_ID = "TU_CHAT_ID_DE_USERINFOBOT"


def capturar_pantalla_chart(chart_url):
    """Abre el gráfico de TradingView en segundo plano y captura una foto."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(chart_url, wait_until="networkidle")
        # Espera 3 segundos a que carguen los indicadores
        page.wait_for_timeout(3000)
        image_path = "chart.png"
        page.screenshot(path=image_path)
        browser.close()
        return image_path


def enviar_telegram_imagen(texto, image_path):
    """Envía la imagen con el texto directo a tu Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
    with open(image_path, "rb") as foto:
        payload = {
            "chat_id": CHAT_ID,
            "caption": texto,
            "parse_mode": "Markdown",
        }
        files = {"photo": foto}
        requests.post(url, data=payload, files=files)


@app.route("/webhook", methods=["POST"])
def webhook():
    datos = request.json
    print("Alerta recibida:", datos)

    ticker = datos.get("ticker", "BTCUSDT")
    accion = datos.get("action", "ALERTA")
    precio = datos.get("price", "0")
    chart_url = datos.get("chart_url", "https://www.tradingview.com/chart/")

    # Formato de texto con soporte Markdown
    mensaje = (
        f"🚨 *ALERTA DE TRADINGVIEW* 🚨\n\n"
        f"📈 *Activo:* `{ticker}`\n"
        f"⚡ *Acción:* {accion}\n"
        f"💵 *Precio:* {precio}"
    )

    try:
        foto_path = capturar_pantalla_chart(chart_url)
        enviar_telegram_imagen(mensaje, foto_path)
        return "Alerta enviada a Telegram con éxito", 200
    except Exception as e:
        print("Error al procesar la alerta:", e)
        return "Error", 500


if __name__ == "__main__":
    app.run(port=5000)