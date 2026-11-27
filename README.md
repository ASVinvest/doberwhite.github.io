# Monitor Macro Global · Doberwhite — datos

Este repositorio **solo guarda los datos** del monitor (`monitor_datos.json`, cifrado con la clave de la Mesa).
La página está en `doberwhite.com/monitor.html` y lee el archivo desde aquí.

- `monitor_actualizar.py`: descarga, calcula y cifra.
- `.github/workflows/actualizar.yml`: lo ejecuta cada 30 min (lunes a viernes) en la nube de GitHub.
- No corre nada en el PC de la Mesa.

Fuentes (todas gratis): Yahoo Finance (respaldo Stooq) · FRED · OCDE · FMI · BIS · mindicador.cl (Banco Central de Chile) · NBS China.
Recesión 12m: modelo Doberwhite v0, sin calibrar.
