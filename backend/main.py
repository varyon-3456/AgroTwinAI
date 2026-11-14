
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from datetime import date, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
import json
import sqlite3
from pathlib import Path
from pydantic import BaseModel, Field


app = FastAPI(
    title="AgroTwin AI",
    description="Plataforma inteligente de agricultura de precisión",
    version="1.0.0"
)


# Configuración CORS para conectar React con FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://agrotwin-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ==========================================
# BASE DE DATOS SQLITE - AGROTWIN AI
# ==========================================

DB_PATH = Path(__file__).resolve().parent / "agrotwin.db"


def conectar_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def inicializar_db():
    with conectar_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parcelas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                coordinates TEXT NOT NULL,
                area_ha REAL NOT NULL,
                crop TEXT DEFAULT 'Sin definir'
            )
        """)


inicializar_db()


# Datos recibidos desde React
class ParcelaCreate(BaseModel):
    name: str
    coordinates: list
    areaHa: float = Field(gt=0)
    crop: str = "Sin definir"


# Consultar todas las parcelas
@app.get("/api/parcelas")
def obtener_parcelas():
    with conectar_db() as conn:
        rows = conn.execute(
            "SELECT * FROM parcelas ORDER BY id DESC"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "coordinates": json.loads(row["coordinates"]),
            "areaHa": row["area_ha"],
            "crop": row["crop"]
        }
        for row in rows
    ]


# Guardar una parcela
@app.post("/api/parcelas")
def guardar_parcela(parcela: ParcelaCreate):
    if not parcela.name.strip() or not parcela.coordinates:
        raise HTTPException(
            status_code=400,
            detail="Faltan datos de la parcela."
        )

    with conectar_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO parcelas (name, coordinates, area_ha, crop)
            VALUES (?, ?, ?, ?)
            """,
            (
                parcela.name.strip(),
                json.dumps(parcela.coordinates),
                parcela.areaHa,
                parcela.crop
            )
        )

        nuevo_id = cursor.lastrowid

    return {
        "id": nuevo_id,
        "name": parcela.name,
        "coordinates": parcela.coordinates,
        "areaHa": parcela.areaHa,
        "crop": parcela.crop,
        "mensaje": "Parcela guardada correctamente"
    }


# Actualizar una parcela
@app.put("/api/parcelas/{parcela_id}")
def actualizar_parcela(parcela_id: int, parcela: ParcelaCreate):
    with conectar_db() as conn:
        cursor = conn.execute(
            """
            UPDATE parcelas
            SET name = ?, coordinates = ?, area_ha = ?, crop = ?
            WHERE id = ?
            """,
            (
                parcela.name.strip(),
                json.dumps(parcela.coordinates),
                parcela.areaHa,
                parcela.crop,
                parcela_id
            )
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Parcela no encontrada."
            )

    return {"mensaje": "Parcela actualizada correctamente"}


# Eliminar una parcela
@app.delete("/api/parcelas/{parcela_id}")
def eliminar_parcela(parcela_id: int):
    with conectar_db() as conn:
        cursor = conn.execute(
            "DELETE FROM parcelas WHERE id = ?",
            (parcela_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Parcela no encontrada."
            )

    return {"mensaje": "Parcela eliminada correctamente"}



# Ruta principal
@app.get("/")
def inicio():
    return {
        "proyecto": "AgroTwin AI",
        "estado": "Funcionando correctamente",
        "descripcion": "Gemelo digital agrícola con IA y datos NASA"
    }


# Estado del sistema
@app.get("/api/estado")
def estado():
    return {
        "sistema": "AgroTwin AI",
        "backend": "Activo",
        "nasa": "Conectado mediante API",
        "inteligencia_artificial": "En desarrollo"
    }


# Conexión NASA POWER - Amarilis, Huánuco
@app.get("/api/nasa/amarilis")
def nasa_amarilis():

    # Coordenadas de referencia de Amarilis
    latitude = -9.94472
    longitude = -76.2428

    # Período de consulta: últimos 30 días
    end_date = date.today() - timedelta(days=2)
    start_date = end_date - timedelta(days=29)

    # Parámetros meteorológicos de NASA POWER
    parameters = {
        "parameters": "T2M,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON"
    }

    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/point?"
        + urlencode(parameters)
    )

    try:
        # Consultar NASA POWER
        with urlopen(url, timeout=40) as response:
            nasa_data = json.loads(
                response.read().decode("utf-8")
            )

        data = nasa_data["properties"]["parameter"]

        # Buscar fechas con temperatura válida
        available_dates = sorted(
            data["T2M"].keys(),
            reverse=True
        )

        def valid_value(parameter, day):
            value = data[parameter].get(day)

            if value is None or value == -999:
                return None

            return value

        # Encontrar la fecha más reciente disponible
        latest_date = None

        for day in available_dates:
            if valid_value("T2M", day) is not None:
                latest_date = day
                break

        # Comprobar disponibilidad
        if latest_date is None:
            raise HTTPException(
                status_code=502,
                detail="NASA POWER no proporciona datos válidos para este período."
            )

        # Obtener los valores meteorológicos
        def get_value(parameter):
            return valid_value(parameter, latest_date)

        # Respuesta del sistema
        return {
            "sistema": "AgroTwin AI",
            "fuente": "NASA POWER",
            "ubicacion": "Amarilis, Huánuco, Perú",

            "coordenadas": {
                "latitud": latitude,
                "longitud": longitude
            },

            "fecha": latest_date,

            "unidades": {
                "temperatura": "°C",
                "precipitacion": "mm/día",
                "humedad": "%",
                "viento": "m/s",
                "radiacion_solar": "kWh/m²/día"
            },

            "datos": {
                "temperatura": get_value("T2M"),
                "precipitacion": get_value("PRECTOTCORR"),
                "humedad_relativa": get_value("RH2M"),
                "velocidad_viento": get_value("WS10M"),
                "radiacion_solar": get_value("ALLSKY_SFC_SW_DWN")
            },

            "estado": "Datos recibidos correctamente"
        }

    except HTTPException:
        raise

    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Error al consultar NASA POWER: {str(error)}"
        )

    except (KeyError, ValueError, IndexError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Respuesta inesperada de NASA POWER: {str(error)}"
        )


# ==========================================
# CULTIVOS, INDICADORES Y SERIES NASA POWER
# ==========================================

def asegurar_tablas_agricolas():
    with conectar_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cultivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parcela_id INTEGER,
                nombre TEXT NOT NULL,
                variedad TEXT DEFAULT '',
                fecha_siembra TEXT DEFAULT '',
                temporada TEXT DEFAULT '',
                superficie_ha REAL DEFAULT 0,
                notas TEXT DEFAULT '',
                FOREIGN KEY(parcela_id) REFERENCES parcelas(id) ON DELETE SET NULL
            )
        """)

asegurar_tablas_agricolas()


class CultivoCreate(BaseModel):
    parcela_id: int | None = None
    nombre: str = Field(min_length=1, max_length=100)
    variedad: str = ""
    fecha_siembra: str = ""
    temporada: str = ""
    superficie_ha: float = Field(gt=0)
    notas: str = ""


@app.get("/api/cultivos")
def listar_cultivos():
    with conectar_db() as conn:
        rows = conn.execute("""
            SELECT c.*, p.name AS parcela_nombre
            FROM cultivos c LEFT JOIN parcelas p ON p.id=c.parcela_id
            ORDER BY c.id DESC
        """).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/cultivos")
def crear_cultivo(item: CultivoCreate):
    if item.parcela_id is not None:
        with conectar_db() as conn:
            existe = conn.execute("SELECT id FROM parcelas WHERE id=?", (item.parcela_id,)).fetchone()
        if not existe:
            raise HTTPException(404, "La parcela seleccionada no existe.")
    with conectar_db() as conn:
        cur = conn.execute("""
            INSERT INTO cultivos (parcela_id,nombre,variedad,fecha_siembra,temporada,superficie_ha,notas)
            VALUES (?,?,?,?,?,?,?)
        """, (item.parcela_id,item.nombre.strip(),item.variedad,item.fecha_siembra,item.temporada,item.superficie_ha,item.notas))
        new_id = cur.lastrowid
    return {"id": new_id, **item.model_dump()}


@app.delete("/api/cultivos/{cultivo_id}")
def borrar_cultivo(cultivo_id: int):
    with conectar_db() as conn:
        cur = conn.execute("DELETE FROM cultivos WHERE id=?", (cultivo_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Cultivo no encontrado.")
    return {"ok": True}


@app.get("/api/indicadores")
def indicadores():
    with conectar_db() as conn:
        nparcelas = conn.execute("SELECT COUNT(*) n FROM parcelas").fetchone()["n"]
        area_total = conn.execute("SELECT COALESCE(SUM(area_ha),0) a FROM parcelas").fetchone()["a"]
        ncultivos = conn.execute("SELECT COUNT(DISTINCT nombre) n FROM cultivos").fetchone()["n"]
        cultivos = conn.execute("""
            SELECT nombre, ROUND(SUM(superficie_ha),2) superficie_ha
            FROM cultivos GROUP BY nombre ORDER BY superficie_ha DESC
        """).fetchall()
        superficie_cultivada = conn.execute("SELECT COALESCE(SUM(superficie_ha),0) a FROM cultivos").fetchone()["a"]
    return {
        "parcelas": nparcelas,
        "area_total_ha": round(area_total,2),
        "cultivos_distintos": ncultivos,
        "superficie_cultivada_ha": round(superficie_cultivada,2),
        "distribucion": [dict(r) for r in cultivos]
    }


@app.get("/api/nasa/power/serie")
def nasa_power_serie():
    latitude, longitude = -9.94472, -76.2428
    end_date = date.today() - timedelta(days=2)
    start_date = end_date - timedelta(days=29)
    params = {
        "parameters": "T2M,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN",
        "community": "AG", "longitude": longitude, "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"), "end": end_date.strftime("%Y%m%d"),
        "format": "JSON"
    }
    url = "https://power.larc.nasa.gov/api/temporal/daily/point?" + urlencode(params)
    try:
        with urlopen(url, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
        params_data = payload["properties"]["parameter"]
        days = sorted(params_data["T2M"].keys())
        series = []
        for day in days:
            def val(key):
                value = params_data.get(key, {}).get(day)
                return None if value is None or value == -999 else value
            if val("T2M") is not None:
                series.append({
                    "fecha": f"{day[:4]}-{day[4:6]}-{day[6:]}",
                    "temperatura": val("T2M"),
                    "precipitacion": val("PRECTOTCORR"),
                    "humedad": val("RH2M"),
                    "viento": val("WS10M"),
                    "radiacion": val("ALLSKY_SFC_SW_DWN")
                })
        return {"fuente":"NASA POWER Daily API","ubicacion":"Amarilis, Huánuco, Perú",
                "coordenadas":{"latitud":latitude,"longitud":longitude},
                "periodo":{"inicio":start_date.isoformat(),"fin":end_date.isoformat()},
                "nota":"Estimaciones meteorológicas en escala espacial amplia; no son mediciones dentro de cada parcela.",
                "serie":series}
    except Exception as error:
        raise HTTPException(502, f"No se pudo consultar la serie NASA POWER: {error}")
