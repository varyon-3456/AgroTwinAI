# AgroTwin AI — entrega mejorada

Plataforma web bilingüe (español/inglés) para explorar parcelas agrícolas y relacionar su información geográfica con observaciones ambientales de NASA.

## Ejecutar en Windows

1. Instala **Python 3.10+** y **Node.js LTS**.
2. Extrae el ZIP completo.
3. Abre la carpeta `AgroTwinAI_Entrega` en VS Code.
4. Ejecuta `start.bat` (doble clic o desde la terminal: `.\start.bat`).
5. Se abrirán dos terminales. Mantén ambas abiertas.
6. Abre `http://127.0.0.1:5173`.

La primera ejecución crea el entorno virtual Python e instala dependencias. El frontend instala sus paquetes npm si aún no existe `node_modules`.

## Funciones incluidas

- **Panel:** indicadores calculados desde la base de datos local (sin cifras ficticias).
- **Parcelas:** mapa de Amarilis, dibujo de polígonos/rectángulos, cálculo de superficie con Turf.js, guardado persistente en SQLite y listado/eliminación.
- **Cultivos:** registro de cultivo, variedad, parcela, fecha de siembra, campaña, superficie y notas; distribución por hectáreas.
- **Clima NASA:** NASA POWER Daily Point API, consulta de último dato disponible y serie diaria de hasta 30 días con temperatura, precipitación, humedad, viento y radiación.
- **Mapa NASA:** capa de visualización MODIS desde NASA GIBS; capa SMAP regional disponible como selección visual cuando el servicio proporciona teselas para la fecha y zona.
- **Suelo y agua:** explicación de límites de resolución y por qué no se genera una puntuación ficticia de salud del suelo.
- **Gemelo digital:** vista conjunta de parcela, cultivo y contexto ambiental.
- **Escenarios:** formulario de exploración cualitativa de factores de rotación. No emite una recomendación agronómica automática ni validada.
- **Reportes:** exportación CSV de parcelas y cultivos registrados.
- **Idioma:** selector Español / English en la barra superior.

## Fuentes y alcance de los datos

- **NASA POWER:** `https://power.larc.nasa.gov/` — T2M, PRECTOTCORR, RH2M, WS10M y ALLSKY_SFC_SW_DWN para el punto de referencia de Amarilis, Huánuco (-9.94472, -76.2428). Son estimaciones en escala espacial amplia, no mediciones dentro de cada parcela.
- **NASA GIBS:** `https://nasa-gibs.github.io/gibs-api-docs/` — teselas de visualización satelital. La capa de reflectancia MODIS se usa como superposición visual. La disponibilidad de cada día/capa depende del procesamiento NASA.
- **NASA SMAP:** `https://smap.jpl.nasa.gov/` — observaciones de humedad superficial a escala regional. No equivale a humedad exacta de una parcela ni a un análisis químico del suelo.
- **Mapa base:** Esri World Imagery (se muestra atribución en el mapa).

## Lo que no debe interpretarse como resultado validado

El índice químico de salud del suelo, humedad exacta a nivel de parcela, rendimiento, detección de plagas y recomendaciones automáticas de rotación requieren datos locales y validación agronómica. La plataforma no inventa esas cifras. El análisis de escenarios es una herramienta de organización de factores para revisión humana.

## API local

- Aplicación: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`
- Documentación: `http://127.0.0.1:8000/docs`
- `GET /api/parcelas`, `POST /api/parcelas`, `DELETE /api/parcelas/{id}`
- `GET /api/cultivos`, `POST /api/cultivos`, `DELETE /api/cultivos/{id}`
- `GET /api/indicadores`
- `GET /api/nasa/amarilis`
- `GET /api/nasa/power/serie`

## Ejecutar por separado

- Backend: `backend\start_backend.bat`
- Frontend: `frontend\start_frontend.bat`

## GitHub

`.gitignore` excluye `.venv`, `node_modules`, cachés y archivos locales. No subas esos directorios al repositorio.
