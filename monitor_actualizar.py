"""
Monitor Macro Global · Doberwhite
Actualizador de datos (corre en GitHub Actions, NO en el PC de Ariel).

Qué hace cada vez que corre:
  1. Descarga datos gratis de fuentes públicas (Yahoo Finance, FRED, OCDE, FMI, BIS, mindicador.cl).
  2. Calcula cambios del día, volatilidad normal (σ), señales y el modelo de recesión.
  3. Cifra todo con la clave de la Mesa (AES-256-GCM + PBKDF2, mismo formato que mesa_publicar.py).
  4. Escribe monitor_datos.json (cifrado). El workflow hace el commit.

Si una fuente falla, sigue con las demás y conserva el último dato bueno de esa fuente.
Nunca escribe datos sin cifrar: si falta la clave, se detiene sin publicar nada.
"""
import base64, datetime as dt, io, json, math, os, sys, time, zipfile

import requests

ITER = 200_000
SALIDA = "monitor_datos.json"
CACHE = "cache_ultimo.json.enc"       # último dato bueno por fuente (cifrado también)
UA = {"User-Agent": "Mozilla/5.0 (DoberwhiteMonitor; +https://www.doberwhite.com)"}
AHORA = dt.datetime.now(dt.timezone.utc)
LOG = []


def log(msg):
    LOG.append(msg)
    print(msg, flush=True)


# ------------------------------------------------------------------ cifrado (igual que la Mesa)
def _kdf(clave, sal):
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=sal, iterations=ITER).derive(clave.encode("utf-8"))


def cifrar(texto, clave):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    sal, iv = os.urandom(16), os.urandom(12)
    d = AESGCM(_kdf(clave, sal)).encrypt(iv, texto.encode("utf-8"), None)
    b = lambda x: base64.b64encode(x).decode()  # noqa: E731
    return {"v": 1, "n": ITER, "s": b(sal), "iv": b(iv), "d": b(d)}


def descifrar(o, clave):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    u = base64.b64decode
    return AESGCM(_kdf(clave, u(o["s"]))).decrypt(u(o["iv"]), u(o["d"]), None).decode("utf-8")


# ------------------------------------------------------------------ utilidades
def get(url, **kw):
    for intento in range(3):
        try:
            r = requests.get(url, headers=UA, timeout=40, **kw)
            if r.status_code == 200:
                return r
            log(f"  · {url[:80]} → HTTP {r.status_code}")
        except Exception as e:  # noqa: BLE001
            log(f"  · {url[:80]} → {type(e).__name__}")
        time.sleep(2 + intento * 3)
    return None


def r2(x, d=4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), d)


# ------------------------------------------------------------------ 1. MERCADOS (Yahoo Finance)
TICKERS = {
    # bolsas
    "IX_US": "^GSPC", "IX_CN": "000001.SS", "IX_DE": "^GDAXI", "IX_JP": "^N225", "IX_IN": "^NSEI",
    "IX_GB": "^FTSE", "IX_FR": "^FCHI", "IX_BR": "^BVSP", "IX_CL": "^IPSA", "IX_MX": "^MXX",
    "IX_CO": "^COLCAP", "IX_PE": "^SPBLPGPT", "IX_AR": "^MERV",
    # monedas (FX_xx: dólar por moneda o moneda por dólar según 'inv' en la página)
    "FX_US": "DX-Y.NYB", "FX_CN": "CNY=X", "FX_EU": "EURUSD=X", "FX_JP": "JPY=X", "FX_IN": "INR=X",
    "FX_GB": "GBPUSD=X", "FX_BR": "BRL=X", "FX_CL": "CLP=X", "FX_MX": "MXN=X", "FX_CO": "COP=X",
    "FX_PE": "PEN=X", "FX_AR": "ARS=X",
    # activos
    "BTC": "BTC-USD", "ORO": "GC=F", "BRENT": "BZ=F", "WTI": "CL=F", "COBRE": "HG=F", "VIX": "^VIX",
    "UST10": "^TNX",
}
# respaldo en Stooq (CSV diario gratis) para los que más importan
STOOQ = {"IX_US": "^spx", "IX_DE": "^dax", "IX_JP": "^nkx", "IX_GB": "^ukx", "IX_FR": "^cac",
         "IX_BR": "^bvp", "IX_MX": "^ipc", "FX_EU": "eurusd", "FX_JP": "usdjpy", "FX_GB": "gbpusd",
         "FX_CL": "usdclp", "ORO": "xauusd", "BTC": "btcusd", "COBRE": "hg.f", "BRENT": "cb.f"}


def resumen_serie(cierres, altos=None, bajos=None):
    """cierres: lista de (fecha 'YYYY-MM-DD', valor) ordenada; el último puede ser la barra en curso."""
    c = [v for _, v in cierres if v is not None and not math.isnan(v)]
    if len(c) < 30:
        return None
    p, o = c[-1], c[-2]
    rets = [math.log(c[i] / c[i - 1]) for i in range(max(1, len(c) - 252), len(c)) if c[i - 1] > 0 and c[i] > 0]
    m = sum(rets) / len(rets)
    sd = math.sqrt(sum((x - m) ** 2 for x in rets) / (len(rets) - 1)) * 100
    anio = str(AHORA.year)
    base_ytd = next((v for f, v in cierres if f >= anio and v), None)
    prev_ytd = [v for f, v in cierres if f < anio and v]
    base_ytd = prev_ytd[-1] if prev_ytd else base_ytd
    mm = lambda k: c[-k] if len(c) >= k else c[0]  # noqa: E731
    ma200 = sum(c[-200:]) / min(200, len(c))
    # cierre de fin de cada mes (para el modelo de recesión y gráficos)
    mens = {}
    for f, v in cierres:
        if v:
            mens[f[:7]] = v
    return {"p": r2(p, 6), "o": r2(o, 6),
            "lo": r2(min(bajos[-1], p) if bajos else min(p, o), 6), "hi": r2(max(altos[-1], p) if altos else max(p, o), 6),
            "sd": r2(sd, 3), "ytd": r2((p / base_ytd - 1) * 100, 2) if base_ytd else None,
            "r6m": r2((p / mm(126) - 1) * 100, 2), "r12m": r2((p / mm(252) - 1) * 100, 2),
            "ma200": r2(ma200, 6), "f": cierres[-1][0], "mens": {k: r2(v, 6) for k, v in list(mens.items())[-30:]}}


def mercados_yahoo():
    import yfinance as yf
    out = {}
    simbolos = list(TICKERS.values())
    try:
        df = yf.download(simbolos, period="2y", interval="1d", group_by="ticker", auto_adjust=False,
                         progress=False, threads=True)
    except Exception as e:  # noqa: BLE001
        log(f"[yahoo] descarga falló: {type(e).__name__}: {e}")
        return out
    for clave, t in TICKERS.items():
        try:
            d = df[t].dropna(subset=["Close"])
            cierres = [(i.strftime("%Y-%m-%d"), float(v)) for i, v in d["Close"].items()]
            res = resumen_serie(cierres, list(d["High"].astype(float)), list(d["Low"].astype(float)))
            if res:
                if clave == "UST10" and res["p"] > 20:  # por si Yahoo lo entrega x10
                    for k in ("p", "o", "lo", "hi", "ma200"):
                        res[k] = r2(res[k] / 10, 4)
                out[clave] = res
        except Exception as e:  # noqa: BLE001
            log(f"[yahoo] {clave} ({t}) sin datos: {type(e).__name__}")
    log(f"[yahoo] {len(out)}/{len(TICKERS)} instrumentos")
    return out


def mercados_stooq(faltan):
    out = {}
    for clave in faltan:
        s = STOOQ.get(clave)
        if not s:
            continue
        r = get(f"https://stooq.com/q/d/l/?s={s}&i=d")
        if not r or "Date" not in r.text[:40]:
            continue
        filas = [x.split(",") for x in r.text.strip().splitlines()[1:]]
        filas = [f for f in filas if len(f) >= 5][-520:]
        try:
            cierres = [(f[0], float(f[4])) for f in filas]
            res = resumen_serie(cierres, [float(f[2]) for f in filas], [float(f[3]) for f in filas])
            if res:
                out[clave] = res
        except ValueError:
            pass
    if out:
        log(f"[stooq] respaldo para: {', '.join(out)}")
    return out


# ------------------------------------------------------------------ 2. FRED (EE.UU.)
FRED = {"T10Y2Y": "curva", "BAMLH0A0HYM2": "hy", "IC4WSA": "claims", "DGS10": "ust10", "DGS2": "ust2"}


def fred(clave_api):
    out = {}
    if not clave_api:
        log("[fred] sin FRED_API_KEY: se omite")
        return out
    desde = (AHORA - dt.timedelta(days=800)).strftime("%Y-%m-%d")
    for sid, nom in FRED.items():
        r = get("https://api.stlouisfed.org/fred/series/observations",
                params={"series_id": sid, "api_key": clave_api, "file_type": "json", "observation_start": desde})
        if not r:
            continue
        obs = [(o["date"], float(o["value"])) for o in r.json().get("observations", []) if o["value"] not in (".", "")]
        if obs:
            mens = {}
            for f, v in obs:
                mens[f[:7]] = v
            out[nom] = {"v": obs[-1][1], "f": obs[-1][0], "v6m": next((v for f, v in reversed(obs) if f <= (AHORA - dt.timedelta(days=182)).strftime("%Y-%m-%d")), None),
                        "prev": obs[-2][1] if len(obs) > 1 else None, "mens": dict(list(mens.items())[-30:])}
    log(f"[fred] {len(out)}/{len(FRED)} series")
    return out


# ------------------------------------------------------------------ 3. OCDE: confianza industrial (equivalente al PMI), líder (CLI), consumidor
PAISES_OCDE = {"US": "USA", "CN": "CHN", "DE": "DEU", "JP": "JPN", "IN": "IND", "GB": "GBR", "FR": "FRA", "BR": "BRA",
               "CL": "CHL", "MX": "MEX", "CO": "COL", "PE": "PER", "AR": "ARG", "MUNDO": "G20", "OCDE": "OECD"}


def ocde():
    areas = "+".join(PAISES_OCDE.values())
    desde = (AHORA - dt.timedelta(days=900)).strftime("%Y-%m")
    out = {}
    for med, nom in (("BCICP", "bci"), ("LI", "cli"), ("CCICP", "cci")):
        url = (f"https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/{areas}.M.{med}...AA...H"
               f"?startPeriod={desde}&format=csvfile")
        r = get(url)
        if not r:
            continue
        import csv
        filas = list(csv.DictReader(io.StringIO(r.text)))
        inv = {v: k for k, v in PAISES_OCDE.items()}
        for f in filas:
            pais = inv.get(f.get("REF_AREA"))
            try:
                v = float(f.get("OBS_VALUE"))
            except (TypeError, ValueError):
                continue
            if pais:
                out.setdefault(pais, {}).setdefault(nom, {})[f.get("TIME_PERIOD")] = round(v, 3)
        time.sleep(3)  # la API de la OCDE limita consultas seguidas
    for pais, d in out.items():
        for nom in list(d):
            d[nom] = dict(sorted(d[nom].items())[-30:])
    log(f"[ocde] países con datos: {len(out)}")
    return out


# ------------------------------------------------------------------ 4. FMI (PIB, inflación, desempleo, deuda, peso en el PIB mundial)
IMF_PAISES = {"US": "USA", "CN": "CHN", "DE": "DEU", "JP": "JPN", "IN": "IND", "GB": "GBR", "FR": "FRA", "BR": "BRA",
              "CL": "CHL", "MX": "MEX", "CO": "COL", "PE": "PER", "AR": "ARG", "MUNDO": "WEOWORLD"}
IMF_IND = {"NGDP_RPCH": "pib", "PCPIPCH": "ipc", "LUR": "des", "GGXWDG_NGDP": "deuda", "NGDPD": "pibusd"}


def fmi():
    out = {}
    anio = str(AHORA.year)
    cods = ",".join(IMF_PAISES.values())
    inv = {v: k for k, v in IMF_PAISES.items()}
    for ind, nom in IMF_IND.items():
        r = get(f"https://www.imf.org/external/datamapper/api/v1/{ind}/{cods}?periods={anio}")
        if not r:
            continue
        vals = r.json().get("values", {}).get(ind, {})
        for cod, serie in vals.items():
            v = serie.get(anio)
            if v is not None and cod in inv:
                out.setdefault(inv[cod], {})[nom] = round(float(v), 2)
    log(f"[fmi] países con datos: {len(out)} (año {anio})")
    return out


# ------------------------------------------------------------------ 5. BIS: tasas de política monetaria
BIS_PAISES = {"US": "US", "CN": "CN", "DE": "XM", "FR": "XM", "JP": "JP", "IN": "IN", "GB": "GB", "BR": "BR",
              "CL": "CL", "MX": "MX", "CO": "CO", "PE": "PE", "AR": "AR"}


def bis():
    r = get("https://data.bis.org/static/bulk/WS_CBPOL_csv_flat.zip")
    out = {}
    if not r:
        return out
    try:
        import csv
        z = zipfile.ZipFile(io.BytesIO(r.content))
        nombre = next(n for n in z.namelist() if n.endswith(".csv"))
        txt = z.read(nombre).decode("utf-8-sig")
        lector = csv.DictReader(io.StringIO(txt))
        col = lambda pref: next(c for c in lector.fieldnames if c.split(":")[0].strip() == pref)  # noqa: E731
        cF, cA, cT, cV = col("FREQ"), col("REF_AREA"), col("TIME_PERIOD"), col("OBS_VALUE")
        ultimo = {}
        for f in lector:
            if f[cF].split(":")[0].strip() != "D":
                continue
            a = f[cA].split(":")[0].strip()
            try:
                v = float(f[cV])
            except ValueError:
                continue
            if a not in ultimo or f[cT] > ultimo[a][0]:
                ultimo[a] = (f[cT], v)
        for pais, a in BIS_PAISES.items():
            if a in ultimo:
                out[pais] = {"v": ultimo[a][1], "f": ultimo[a][0]}
    except Exception as e:  # noqa: BLE001
        log(f"[bis] no se pudo leer: {type(e).__name__}: {e}")
    log(f"[bis] tasas: {len(out)}")
    return out


# ------------------------------------------------------------------ 6. Chile (mindicador.cl, datos del Banco Central e INE)
def chile():
    out = {}
    for cod in ("imacec", "tpm", "tasa_desempleo", "dolar", "libra_cobre", "ipc"):
        r = get(f"https://mindicador.cl/api/{cod}")
        if not r:
            continue
        serie = r.json().get("serie", [])
        if not serie:
            continue
        out[cod] = {"v": serie[0]["valor"], "f": serie[0]["fecha"][:10]}
        if cod == "ipc":  # variación mensual → acumulada 12 meses
            m = [s["valor"] for s in serie[:12]]
            if len(m) == 12:
                acc = 1.0
                for x in m:
                    acc *= 1 + x / 100
                out["ipc12"] = {"v": round((acc - 1) * 100, 2), "f": serie[0]["fecha"][:10]}
    log(f"[chile] indicadores: {len(out)}")
    return out


# ------------------------------------------------------------------ 7. PMI oficial de China (NBS)
def pmi_china():
    r = get("https://chinadata.live/api/v2/data/china-pmi")
    if not r:
        return None
    try:
        j = r.json()
        # formato flexible: buscar la lista de observaciones (fecha, valor)
        cand = j.get("data") if isinstance(j, dict) else j
        if isinstance(cand, dict):
            cand = cand.get("series") or cand.get("observations") or cand.get("data")
        obs = []
        for o in cand or []:
            if isinstance(o, dict):
                f = o.get("date") or o.get("period") or o.get("time")
                v = o.get("value") if o.get("value") is not None else o.get("val")
            else:
                f, v = o[0], o[1]
            if f and v is not None:
                obs.append((str(f)[:7], float(v)))
        obs.sort()
        if obs:
            log(f"[pmi china] {obs[-1][0]} = {obs[-1][1]}")
            return {"v": obs[-1][1], "f": obs[-1][0], "prev": obs[-2][1] if len(obs) > 1 else None}
    except Exception as e:  # noqa: BLE001
        log(f"[pmi china] formato no reconocido: {type(e).__name__}")
    return None


# ------------------------------------------------------------------ modelo de recesión (v0, transparente)
def logistica(z):
    return 1 / (1 + math.exp(-z))


def prob_recesion(cli, cli6, bci, ret6m, curva=None):
    """Probabilidad de recesión a 12 meses (%). Modelo Doberwhite v0 SIN CALIBRAR: pondera
    indicador líder OCDE (nivel y tendencia 6m), confianza industrial, bolsa 6m y, en EE.UU., la curva."""
    z = -1.45
    if cli is not None:
        z += 0.55 * (100 - cli)
    if cli is not None and cli6 is not None:
        z += 0.70 * (cli6 - cli)
    if bci is not None:
        z += 0.25 * (100 - bci)
    if ret6m is not None:
        z += 0.035 * (-ret6m)
    if curva is not None and curva < 0:
        z += 0.9 * (-curva)
    return round(100 * logistica(z), 1)


def meses_atras(n):
    y, m = AHORA.year, AHORA.month
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def ultimo(d, hasta=None):
    if not d:
        return None, None
    ks = sorted(k for k in d if hasta is None or k <= hasta)
    return (ks[-1], d[ks[-1]]) if ks else (None, None)


def menos6(mes):
    y, m = int(mes[:4]), int(mes[5:]) - 6
    if m <= 0:
        y, m = y - 1, m + 12
    return f"{y:04d}-{m:02d}"


# ------------------------------------------------------------------ armado
PAISES = ["US", "CN", "DE", "JP", "IN", "GB", "FR", "BR", "CL", "MX", "CO", "PE", "AR"]


def armar(M, F, O, I, B, CH, PMIC):
    meses = meses_atras(24)
    eco = {}
    for p in PAISES:
        o = O.get(p, {})
        e = {k: v for k, v in I.get(p, {}).items()}
        if p in B:
            e["tasa"] = B[p]["v"]
        f_bci, bci = ultimo(o.get("bci"))
        f_cli, cli = ultimo(o.get("cli"))
        e["bci"], e["bci_f"] = bci, f_bci
        if f_bci:
            e["bci_prev"] = ultimo(o.get("bci"), menos6(f_bci))[1]
        e["cli"], e["cli_f"] = cli, f_cli
        # modelo: historia 24 meses
        hist = []
        ix = M.get(f"IX_{p}", {}).get("mens", {})
        for mes in meses:
            c = ultimo(o.get("cli"), mes)[1]
            c6 = ultimo(o.get("cli"), menos6(mes))[1]
            b = ultimo(o.get("bci"), mes)[1]
            a, a6 = ultimo(ix, mes)[1], ultimo(ix, menos6(mes))[1]
            ret = (a / a6 - 1) * 100 if a and a6 else None
            cur = ultimo(F.get("curva", {}).get("mens"), mes)[1] if p == "US" else None
            hist.append(prob_recesion(c, c6, b, ret, cur) if (c or b or ret) else None)
        # dato actual: usa el retorno de bolsa de hoy
        ret_hoy = M.get(f"IX_{p}", {}).get("r6m")
        cur_hoy = F.get("curva", {}).get("v") if p == "US" else None
        c6 = ultimo(o.get("cli"), menos6(f_cli))[1] if f_cli else None
        e["rp"] = prob_recesion(cli, c6, bci, ret_hoy, cur_hoy) if (cli or bci or ret_hoy) else None
        e["rp_hist"] = hist
        eco[p] = e
    # Chile: datos locales más frescos
    c = eco.setdefault("CL", {})
    if "imacec" in CH: c["imacec"] = CH["imacec"]["v"]; c["imacec_f"] = CH["imacec"]["f"]
    if "tpm" in CH: c["tasa"] = CH["tpm"]["v"]
    if "tasa_desempleo" in CH: c["des"] = CH["tasa_desempleo"]["v"]
    if "ipc12" in CH: c["ipc"] = CH["ipc12"]["v"]
    if "dolar" in CH: c["dolar_obs"] = CH["dolar"]["v"]
    if "libra_cobre" in CH: c["cobre_bcch"] = CH["libra_cobre"]["v"]
    if PMIC:
        eco.setdefault("CN", {})["pmi_nbs"] = PMIC

    # mundo: ponderado por PIB en dólares (FMI)
    pesos = {p: (I.get(p, {}).get("pibusd") or 0) for p in ["US", "CN", "DE", "JP", "IN", "GB", "FR", "BR"]}
    tot = sum(pesos.values()) or 1

    def pond(vals):
        a = w = 0
        for p, wp in pesos.items():
            v = vals.get(p)
            if v is not None and wp:
                a += v * wp; w += wp
        return round(a / w, 1) if w else None
    rp_mundo = pond({p: eco[p].get("rp") for p in pesos})
    hist_mundo = [pond({p: (eco[p]["rp_hist"][i] if eco[p].get("rp_hist") else None) for p in pesos}) for i in range(24)]

    # indicadores adelantados (señal: 1 a favor, 0 neutral, -1 en contra)
    ind = []

    def add(n, s, v, txt, k):
        if v is not None:
            ind.append({"n": n, "s": s, "v": txt.replace(",", "§").replace(".", ",").replace("§", "."), "k": k})
    og = O.get("OCDE", {}) or O.get("MUNDO", {})
    f1, v1 = ultimo(og.get("bci")); v1p = ultimo(og.get("bci"), menos6(f1))[1] if f1 else None
    add("Confianza industrial OCDE", f"tipo PMI · umbral 100 · {f1 or ''}", v1, f"{v1:.1f}" if v1 else "", 1 if (v1 or 0) >= 100 and (v1p is None or v1 >= v1p) else (-1 if (v1 or 0) < 99.5 else 0))
    f2, v2 = ultimo((O.get("MUNDO") or og).get("cli")); v2p = ultimo((O.get("MUNDO") or og).get("cli"), menos6(f2))[1] if f2 else None
    add("Indicador líder (CLI)", f"G20 · 100 = tendencia · {f2 or ''}", v2, f"{v2:.1f}" if v2 else "", 1 if (v2 or 0) >= 100 and (v2p is None or v2 >= v2p) else (-1 if (v2 or 0) < 99.5 else 0))
    f3, v3 = ultimo(og.get("cci"))
    add("Confianza del consumidor", f"OCDE · umbral 100 · {f3 or ''}", v3, f"{v3:.1f}" if v3 else "", 1 if (v3 or 0) >= 100.3 else (-1 if (v3 or 0) < 99.5 else 0))
    if PMIC:
        add("PMI oficial China (NBS)", f"umbral 50 · {PMIC['f']}", PMIC["v"], f"{PMIC['v']:.1f}", 1 if PMIC["v"] >= 50.5 else (-1 if PMIC["v"] < 49.5 else 0))
    cu = F.get("curva", {}).get("v")
    add("Curva EE.UU. 10a–2a", "bajo 0 = invertida", cu, f"{cu:+.2f} pp" if cu is not None else "", 1 if (cu or 0) > 0.5 else (-1 if (cu or 0) < 0 else 0))
    hy = F.get("hy", {}).get("v")
    add("Spread high yield EE.UU.", "sobre Tesoro", hy, f"{hy:.2f} pp" if hy is not None else "", 1 if (hy or 9) < 3.5 else (-1 if (hy or 0) > 5 else 0))
    cl = F.get("claims", {}); clv, cl6 = cl.get("v"), cl.get("v6m")
    if clv:
        d = (clv / cl6 - 1) * 100 if cl6 else 0
        add("Desempleo EE.UU.", "solicitudes · 4 semanas", clv, f"{clv/1000:.0f} mil", 1 if d < 5 else (-1 if d > 15 else 0))
    cu6, au6 = M.get("COBRE", {}).get("r6m"), M.get("ORO", {}).get("r6m")
    if cu6 is not None and au6 is not None:
        rel = ((1 + cu6 / 100) / (1 + au6 / 100) - 1) * 100
        add("Ratio cobre / oro", "6 meses", rel, f"{rel:+.1f}%", 1 if rel > 5 else (-1 if rel < -5 else 0))
    vx = M.get("VIX", {}).get("p")
    add("VIX", "volatilidad S&P 500", vx, f"{vx:.1f}" if vx else "", 1 if (vx or 99) < 18 else (-1 if (vx or 0) > 25 else 0))
    sp = M.get("IX_US", {})
    if sp.get("p") and sp.get("ma200"):
        dif = (sp["p"] / sp["ma200"] - 1) * 100
        add("S&P 500 vs media 200 días", "tendencia de fondo", dif, f"{dif:+.1f}%", 1 if dif > 2 else (-1 if dif < -2 else 0))
    br = M.get("BRENT", {}).get("r12m")
    add("Brent a/a", "demanda de energía", br, f"{br:+.1f}%" if br is not None else "", 0 if br is None or -20 < br < 25 else (1 if br >= 25 else -1))

    return {"gen": AHORA.isoformat(timespec="seconds"), "mk": M, "eco": eco, "fred": {k: {kk: vv for kk, vv in v.items() if kk != "mens"} for k, v in F.items()},
            "ind": ind, "mundo": {"rp": rp_mundo, "rp_hist": hist_mundo, "meses": meses, "bci": v1, "cli": v2,
                                  "pib": I.get("MUNDO", {}).get("pib"), "ipc": I.get("MUNDO", {}).get("ipc")},
            "pesos": {p: round(w / tot * 100, 2) for p, w in pesos.items()},
            "modelo": "Recesión 12m: modelo Doberwhite v0 (sin calibrar) con indicador líder OCDE, confianza industrial, bolsa 6m y curva EE.UU.",
            "log": LOG[-40:]}


def main():
    clave = os.environ.get("MESA_CLAVE", "").strip()
    if len(clave) < 8:
        print("ERROR: falta MESA_CLAVE (secreto del repositorio). No se publica nada.")
        sys.exit(1)
    cache = {}
    if os.path.exists(CACHE):
        try:
            cache = json.loads(descifrar(json.load(open(CACHE)), clave))
        except Exception:  # noqa: BLE001
            log("[cache] no se pudo leer (¿cambió la clave?): se ignora")

    hoy = AHORA.strftime("%Y-%m-%d")
    lento = cache.get("_dia") != hoy or os.environ.get("FORZAR_TODO") == "1"   # fuentes mensuales: 1 vez al día

    M = mercados_yahoo()
    faltan = [k for k in TICKERS if k not in M]
    if faltan:
        M.update(mercados_stooq(faltan))
    for k, v in cache.get("M", {}).items():       # último dato bueno si hoy falló
        M.setdefault(k, v)

    if lento:
        F = fred(os.environ.get("FRED_API_KEY", "").strip()) or cache.get("F", {})
        O = ocde() or cache.get("O", {})
        I = fmi() or cache.get("I", {})
        B = bis() or cache.get("B", {})
        CH = chile() or cache.get("CH", {})
        PMIC = pmi_china() or cache.get("PMIC")
    else:
        F, O, I, B, CH, PMIC = (cache.get(k, {}) for k in ("F", "O", "I", "B", "CH", "PMIC"))
        PMIC = PMIC or None
        log("[lento] fuentes mensuales tomadas del caché de hoy")

    datos = armar(M, F, O, I, B, CH, PMIC)
    with open(SALIDA, "w") as f:
        json.dump(cifrar(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), clave), f)
    nuevo = {"_dia": hoy, "M": M, "F": F, "O": O, "I": I, "B": B, "CH": CH, "PMIC": PMIC}
    with open(CACHE, "w") as f:
        json.dump(cifrar(json.dumps(nuevo, ensure_ascii=False, separators=(",", ":")), clave), f)
    print(f"OK · {SALIDA} cifrado · {len(M)} instrumentos · {len(datos['ind'])} indicadores")


if __name__ == "__main__":
    main()
