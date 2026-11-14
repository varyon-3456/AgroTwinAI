import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { GeoJSON } from "react-leaflet";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import area from "@turf/area";
import {
  Sprout, LayoutDashboard, Map as MapIcon, CloudSun, Droplets, Satellite,
  BrainCircuit, FileText, History, Menu, Plus, RefreshCw, Trash2, Save,
  Languages, Leaf, Wind, CloudRain, ThermometerSun, FlaskConical,
  AlertTriangle, CheckCircle2, ExternalLink, Download, ChevronRight,
  Layers, Tractor, CalendarDays, Activity, X, MapPin
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";
const CENTER = [-9.94472, -76.2428];
const nav = [
  ["Dashboard", LayoutDashboard], ["Parcelas", MapIcon], ["Cultivos", Sprout],
  ["Clima NASA", CloudSun], ["Suelo y agua", Droplets], ["Gemelo digital", Satellite],
  ["Análisis de escenarios", BrainCircuit], ["Reportes", FileText], ["Historial", History]
];
const translations = {
  es: {
    menu:"MENÚ PRINCIPAL", dashboard:"Panel de control", fields:"Parcelas", crops:"Cultivos",
    climate:"Clima NASA", soil:"Suelo y agua", twin:"Gemelo digital", scenarios:"Análisis de escenarios",
    reports:"Reportes", history:"Historial", welcome:"Bienvenido a AgroTwin AI",
    subtitle:"Observaciones de la Tierra para explorar decisiones agrícolas más resilientes.",
    fieldsTotal:"Parcelas registradas", area:"Área registrada", cropsTotal:"Cultivos registrados",
    cultivated:"Superficie cultivada", monitoring:"Exploración satelital", climateTitle:"Clima y condiciones",
    soilTitle:"Humedad del suelo por satélite", distribution:"Distribución de cultivos",
    alerts:"Estado de la plataforma", addParcel:"Guardar parcela dibujada",
    addCrop:"Registrar cultivo", noParcels:"Todavía no hay parcelas. Dibuja un polígono o rectángulo en el mapa.",
    noCrops:"Todavía no hay cultivos registrados. Añade uno para generar la distribución.",
    noSoil:"La capa SMAP es una observación satelital regional; no representa una muestra de suelo de tu parcela.",
    refresh:"Actualizar datos", source:"Fuente", date:"Fecha de dato",
    save:"Guardar", cancel:"Cancelar", name:"Nombre", crop:"Cultivo", areaHa:"Superficie (ha)",
    parcel:"Parcela", variety:"Variedad", planting:"Fecha de siembra", season:"Campaña",
    notes:"Notas", delete:"Eliminar", language:"English", loading:"Cargando…",
    nasaNote:"NASA POWER entrega estimaciones en una escala espacial amplia. No son mediciones directas de cada campo.",
    mapNote:"Capa base Esri · Observación NASA GIBS superpuesta cuando está disponible.",
    noScore:"No calculado", noScoreNote:"Se requieren análisis locales de suelo (pH, textura, materia orgánica y nutrientes).",
    scenariosNote:"Explora factores para comparar estrategias. No son recomendaciones agronómicas validadas.",
    currentPractice:"Práctica actual", alternative:"Alternativa", water:"Demanda de agua", soilCover:"Cobertura del suelo",
    nutrient:"Ciclo de nutrientes", feasibility:"Viabilidad local", compare:"Comparar factores",
    reportDownload:"Descargar resumen CSV", status:"Conexión API", gibs:"NASA GIBS: reflectancia MODIS",
    smap:"NASA SMAP: humedad del suelo", basemap:"Imagen satelital Esri"
  },
  en: {
    menu:"MAIN MENU", dashboard:"Dashboard", fields:"Fields", crops:"Crops", climate:"NASA Climate",
    soil:"Soil & water", twin:"Digital twin", scenarios:"Scenario analysis", reports:"Reports", history:"History",
    welcome:"Welcome to AgroTwin AI", subtitle:"Earth observations to explore more resilient agricultural decisions.",
    fieldsTotal:"Registered parcels", area:"Registered area", cropsTotal:"Registered crops",
    cultivated:"Cultivated area", monitoring:"Satellite exploration", climateTitle:"Climate conditions",
    soilTitle:"Satellite soil moisture", distribution:"Crop distribution", alerts:"Platform status",
    addParcel:"Save drawn parcel", addCrop:"Register crop", noParcels:"No parcels yet. Draw a polygon or rectangle on the map.",
    noCrops:"No crops registered yet. Add one to generate the distribution.", noSoil:"SMAP is a regional satellite observation, not a soil sample from your parcel.",
    refresh:"Refresh data", source:"Source", date:"Data date", save:"Save", cancel:"Cancel",
    name:"Name", crop:"Crop", areaHa:"Area (ha)", parcel:"Parcel", variety:"Variety",
    planting:"Planting date", season:"Season", notes:"Notes", delete:"Delete", language:"Español",
    loading:"Loading…", nasaNote:"NASA POWER provides estimates at broad spatial scales, not direct field measurements.",
    mapNote:"Esri base layer · NASA GIBS observation overlay where available.",
    noScore:"Not calculated", noScoreNote:"Local soil tests (pH, texture, organic matter and nutrients) are required.",
    scenariosNote:"Explore factors to compare strategies. These are not validated agronomic recommendations.",
    currentPractice:"Current practice", alternative:"Alternative", water:"Water demand", soilCover:"Soil cover",
    nutrient:"Nutrient cycle", feasibility:"Local feasibility", compare:"Compare factors",
    reportDownload:"Download CSV summary", status:"API connection", gibs:"NASA GIBS: MODIS reflectance",
    smap:"NASA SMAP: soil moisture", basemap:"Esri satellite imagery"
  }
};

function MapTools({ onDraw, onUpdate }) {
  const map = useMap();
  useEffect(() => {
    if (!map.pm) return;
    map.pm.addControls({ position:"topleft", drawPolygon:true, drawRectangle:true, drawMarker:false,
      drawCircle:false, drawCircleMarker:false, drawPolyline:false, editMode:true, dragMode:false,
      removalMode:false, cutPolygon:false, rotateMode:false });
    const created = (e) => {
      const feature = e.layer.toGeoJSON();
      const hectares = area(feature) / 10000;
      onDraw({ geometry:feature.geometry, areaHa:Number(hectares.toFixed(3)) });
    };
    const edited = async (event) => {
      const layer = event.layer;
      const parcelId = layer?.feature?.properties?.parcelId;
      if (!parcelId) return;
      const feature = layer.toGeoJSON();
      onUpdate(parcelId, feature.geometry);
    };
    map.on("pm:create", created);
    map.on("pm:edit", edited);
    return () => { map.off("pm:create", created); map.off("pm:edit", edited); map.pm.removeControls(); };
  }, [map, onDraw, onUpdate]);
  return null;
}

function MapView({ parcels, onDraw, onUpdate, layer, lang }) {
  const date = "default";
  const layerName = layer === "smap" ? "SMAP_L4_Soil_Moisture_Layer_1" : "MODIS_Terra_CorrectedReflectance_TrueColor";
  return <MapContainer center={CENTER} zoom={13} scrollWheelZoom className="agro-map">
    <TileLayer attribution="&copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19}/>
    <TileLayer attribution="NASA GIBS / NASA Earthdata" url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerName}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`} opacity={layer==="smap" ? 0.72 : 0.82} maxNativeZoom={9} maxZoom={19}/>
    {parcels.map(p => <GeoJSON key={p.id} data={{type:"Feature",properties:{name:p.name,parcelId:p.id},geometry:{type:"MultiPolygon",coordinates:[p.coordinates]}}} style={{color:"#73e6a0",weight:3,fillOpacity:.22}}/>)}
    <MapTools onDraw={onDraw} onUpdate={onUpdate}/>
  </MapContainer>;
}

function Stat({icon:Icon,label,value,detail}) {
  return <article className="stat"><span className="stat-icon"><Icon size={20}/></span><small>{label}</small><strong>{value}</strong><em>{detail}</em></article>;
}
function App() {
  const [lang,setLang] = useState("es");
  const t = translations[lang];
  const [active,setActive] = useState("Dashboard");
  const [mobile,setMobile] = useState(false);
  const [apiStatus,setApiStatus] = useState("Comprobando");
  const [nasa,setNasa] = useState(null);
  const [series,setSeries] = useState([]);
  const [parcels,setParcels] = useState([]);
  const [crops,setCrops] = useState([]);
  const [indicators,setIndicators] = useState({parcelas:0,area_total_ha:0,cultivos_distintos:0,superficie_cultivada_ha:0,distribucion:[]});
  const [error,setError] = useState("");
  const [layer,setLayer] = useState("modis");
  const [draft,setDraft] = useState(null);
  const [parcelForm,setParcelForm] = useState({name:"",crop:"Sin definir"});
  const [cropForm,setCropForm] = useState({parcela_id:"",nombre:"",variedad:"",fecha_siembra:"",temporada:"",superficie_ha:"",notas:""});
  const [scenario,setScenario] = useState({water:"moderate",cover:"high",nutrient:"legume",feasibility:"review"});
  const [notice,setNotice] = useState("");

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [status,p,n,c,i,s] = await Promise.all([
        fetch(`${API}/api/estado`), fetch(`${API}/api/parcelas`), fetch(`${API}/api/nasa/amarilis`),
        fetch(`${API}/api/cultivos`), fetch(`${API}/api/indicadores`), fetch(`${API}/api/nasa/power/serie`)
      ]);
      if (![status,p,n,c,i,s].every(r=>r.ok)) throw new Error("Una o más consultas fallaron. Comprueba que el backend esté activo y vuelve a intentar.");
      const [sv,pv,nv,cv,iv,ss] = await Promise.all([status.json(),p.json(),n.json(),c.json(),i.json(),s.json()]);
      setApiStatus(sv.backend || "Activo"); setParcels(pv); setNasa(nv); setCrops(cv); setIndicators(iv); setSeries(ss.serie || []);
    } catch(e) { setApiStatus("Desconectado"); setError(e.message); }
  },[]);
  useEffect(()=>{loadAll();},[loadAll]);

  const onDraw = useCallback((shape)=>{setDraft(shape);setParcelForm({name:`Parcela ${parcels.length+1}`,crop:"Sin definir"});setNotice("Dibujo creado. Completa el nombre y guarda la parcela.");},[parcels.length]);
  const updateParcelGeometry = useCallback(async (id, geometry) => {
    const feature = {type:"Feature",properties:{},geometry};
    const found = parcels.find(p=>p.id===id);
    if (!found) return;
    const hectares = Number((area(feature)/10000).toFixed(3));
    const res = await fetch(`${API}/api/parcelas/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:found.name, coordinates:geometry.coordinates, areaHa:hectares, crop:found.crop || "Sin definir"
    })});
    if (res.ok) { setNotice(`Límites de ${found.name} actualizados y guardados.`); await loadAll(); }
  },[parcels,loadAll]);

  const saveParcel = async (e) => {
    e.preventDefault();
    if (!draft) return;
    const res = await fetch(`${API}/api/parcelas`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:parcelForm.name, coordinates:draft.geometry.coordinates, areaHa:draft.areaHa, crop:parcelForm.crop
    })});
    if (!res.ok) {setNotice("No se pudo guardar la parcela.");return;}
    setDraft(null); setNotice("Parcela guardada en la base de datos."); await loadAll();
  };
  const addCrop = async (e) => {
    e.preventDefault();
    const payload={...cropForm,parcela_id:cropForm.parcela_id?Number(cropForm.parcela_id):null,superficie_ha:Number(cropForm.superficie_ha)};
    const res=await fetch(`${API}/api/cultivos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if (!res.ok) {setNotice("No se pudo registrar el cultivo. Revisa la superficie y la parcela.");return;}
    setCropForm({parcela_id:"",nombre:"",variedad:"",fecha_siembra:"",temporada:"",superficie_ha:"",notas:""});
    setNotice("Cultivo registrado correctamente."); await loadAll();
  };
  const deleteParcel = async id => {if(!confirm("¿Eliminar esta parcela?"))return;await fetch(`${API}/api/parcelas/${id}`,{method:"DELETE"});await loadAll();};
  const deleteCrop = async id => {if(!confirm("¿Eliminar este cultivo?"))return;await fetch(`${API}/api/cultivos/${id}`,{method:"DELETE"});await loadAll();};
  const exportCSV = () => {
    const rows=[["Tipo","Nombre","Superficie ha","Parcela"],...parcels.map(p=>["Parcela",p.name,p.areaHa,""]),...crops.map(c=>["Cultivo",c.nombre,c.superficie_ha,c.parcela_nombre||"Sin asignar"])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="agrotwin_reporte.csv";a.click();URL.revokeObjectURL(a.href);
  };
  const current = nasa?.datos || {};
  const distribution = indicators.distribucion || [];
  const maxCrop = Math.max(1,...distribution.map(x=>x.superficie_ha));
  const latestSeries = series.slice(-7);
  const avg = key => latestSeries.length ? (latestSeries.reduce((a,x)=>a+(Number(x[key])||0),0)/latestSeries.length).toFixed(1) : "--";
  const sectionTitle = nav.find(x=>x[0]===active)?.[0] || active;

  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"open":""}`}>
      <div className="brand"><div className="brand-mark"><Sprout/></div><div><b>AgroTwin <i>AI</i></b><small>NASA EARTH DATA · AGRICULTURE</small></div></div>
      <p className="nav-caption">{t.menu}</p>
      <nav>{nav.map(([name,Icon],idx)=><button key={name} className={active===name?"active":""} onClick={()=>{setActive(name);setMobile(false);}}><Icon size={17}/><span>{t[["dashboard","fields","crops","climate","soil","twin","scenarios","reports","history"][idx]]}</span>{active===name&&<ChevronRight size={15}/>}</button>)}</nav>
      <div className="sidebar-foot"><span className={`status-dot ${apiStatus==="Activo"?"":"offline"}`}/>{t.status}: {apiStatus}<small>AgroTwin AI · Prototype</small></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="mobile-toggle" onClick={()=>setMobile(!mobile)}><Menu/></button>
        <div><span className="eyebrow">NASA SPACE APPS CHALLENGE</span><strong>{sectionTitle}</strong></div>
        <div className="top-actions"><button className="outline-btn" onClick={()=>setLang(lang==="es"?"en":"es")}><Languages size={16}/>{t.language}</button><button className="outline-btn" onClick={loadAll}><RefreshCw size={15}/>{t.refresh}</button></div>
      </header>
      <div className="content">
        {error&&<div className="error-banner"><AlertTriangle size={17}/>{error}</div>}
        {notice&&<div className="notice-banner"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}

        {active==="Dashboard"&&<>
          <section className="hero"><div><span className="eyebrow green">AGRICULTURAL INTELLIGENCE PLATFORM</span><h1>{t.welcome}</h1><p>{t.subtitle}</p></div><div className="hero-location"><MapPin size={16}/> Amarilis, Huánuco, Perú</div></section>
          <section className="stats">
            <Stat icon={MapIcon} label={t.fieldsTotal} value={indicators.parcelas} detail="Base de datos local"/>
            <Stat icon={Sprout} label={t.area} value={`${indicators.area_total_ha} ha`} detail="Suma de parcelas guardadas"/>
            <Stat icon={Leaf} label={t.cropsTotal} value={indicators.cultivos_distintos} detail="Cultivos distintos"/>
            <Stat icon={Activity} label={t.cultivated} value={`${indicators.superficie_cultivada_ha} ha`} detail="Registros de cultivos"/>
          </section>
          <section className="dashboard-grid">
            <article className="panel map-panel"><div className="panel-head"><div><h2>{t.monitoring}</h2><p>Delimita, mide y registra áreas agrícolas</p></div><select value={layer} onChange={e=>setLayer(e.target.value)}><option value="modis">{t.gibs}</option><option value="smap">{t.smap}</option></select></div>
              <div className="map-wrap"><MapView parcels={parcels} onDraw={onDraw} onUpdate={updateParcelGeometry} layer={layer} lang={lang}/><span className="map-chip">NASA GIBS · {layer.toUpperCase()}</span></div>
              <p className="map-foot">{t.mapNote} <span>{parcels.length} parcelas</span></p>
            </article>
            <div className="stack">
              <article className="panel"><div className="panel-head"><div><h2>{t.climateTitle}</h2><p>NASA POWER · Daily Point API</p></div><CloudSun className="green-icon"/></div>
                <div className="climate-main"><strong>{current.temperatura??"--"}°C</strong><span>Temperatura del aire · T2M</span></div>
                <div className="weather-grid"><div><Droplets/><small>Humedad</small><b>{current.humedad_relativa??"--"}%</b></div><div><Wind/><small>Viento</small><b>{current.velocidad_viento??"--"} m/s</b></div><div><CloudRain/><small>Precipitación</small><b>{current.precipitacion??"--"} mm/día</b></div><div><ThermometerSun/><small>Radiación</small><b>{current.radiacion_solar??"--"} kWh/m²/d</b></div></div>
                <p className="source-note">{t.source}: NASA POWER · {nasa?.fecha||"--"}</p><p className="fine-print">{t.nasaNote}</p>
              </article>
              <article className="panel soil-summary"><div className="panel-head"><div><h2>{t.soilTitle}</h2><p>NASA SMAP · capa visual regional</p></div><Droplets className="green-icon"/></div><div className="soil-placeholder"><div className="soil-symbol"><Satellite size={28}/></div><div><b>{t.noScore}</b><p>{t.noSoil}</p></div></div><small>La visualización satelital no sustituye un análisis físico-químico del suelo.</small></article>
            </div>
          </section>
          <section className="lower-grid">
            <article className="panel"><div className="panel-head"><div><h2>Clima · últimos 7 días disponibles</h2><p>Serie diaria de NASA POWER</p></div><Activity className="green-icon"/></div><div className="mini-metrics"><div><small>Temperatura media</small><b>{avg("temperatura")} °C</b></div><div><small>Humedad media</small><b>{avg("humedad")} %</b></div><div><small>Precipitación media</small><b>{avg("precipitacion")} mm/d</b></div></div><div className="series-bars">{latestSeries.map(x=><div key={x.fecha} title={`${x.fecha}: ${x.temperatura} °C`}><i style={{height:`${Math.max(5,Math.min(100,(Number(x.temperatura)+5)*3))}%`}}/><small>{x.fecha.slice(5)}</small></div>)}</div><p className="fine-print">Barras: temperatura media diaria (°C). Datos diarios; no son una predicción meteorológica.</p></article>
            <article className="panel"><div className="panel-head"><div><h2>{t.distribution}</h2><p>Área declarada en registros de cultivos</p></div><Sprout className="green-icon"/></div>{distribution.length? <div className="distribution">{distribution.map(c=><div className="dist-row" key={c.nombre}><div><span>{c.nombre}</span><b>{c.superficie_ha} ha</b></div><div className="bar"><i style={{width:`${c.superficie_ha/maxCrop*100}%`}}/></div></div>)}</div>:<div className="empty-state"><Sprout size={30}/><b>{t.noCrops}</b></div>}</article>
          </section>
        </>}

        {active==="Parcelas"&&<section className="panel page-panel"><div className="panel-head"><div><h1>Gestión de parcelas</h1><p>Dibuja en el mapa, calcula el área y guarda los límites en SQLite.</p></div><MapIcon className="green-icon"/></div><div className="map-wrap large"><MapView parcels={parcels} onDraw={onDraw} onUpdate={updateParcelGeometry} layer={layer} lang={lang}/></div>{draft&&<form className="inline-form" onSubmit={saveParcel}><label>{t.name}<input required value={parcelForm.name} onChange={e=>setParcelForm({...parcelForm,name:e.target.value})}/></label><label>{t.crop}<input value={parcelForm.crop} onChange={e=>setParcelForm({...parcelForm,crop:e.target.value})}/></label><b>Área calculada: {draft.areaHa} ha</b><button className="primary-btn"><Save size={16}/>{t.addParcel}</button><button type="button" className="outline-btn" onClick={()=>setDraft(null)}>{t.cancel}</button></form>}<div className="table-wrap"><table><thead><tr><th>ID</th><th>Parcela</th><th>Superficie</th><th>Uso/cultivo inicial</th><th></th></tr></thead><tbody>{parcels.map(p=><tr key={p.id}><td>#{p.id}</td><td>{p.name}</td><td>{p.areaHa} ha</td><td>{p.crop||"Sin definir"}</td><td><button className="danger-btn" onClick={()=>deleteParcel(p.id)}><Trash2 size={15}/>{t.delete}</button></td></tr>)}</tbody></table>{!parcels.length&&<p className="empty-text">{t.noParcels}</p>}</div></section>}

        {active==="Cultivos"&&<section className="two-col-page"><article className="panel page-panel"><div className="panel-head"><div><h1>Registro de cultivos</h1><p>Asocia cultivos a parcelas y registra la superficie declarada.</p></div><Sprout className="green-icon"/></div><form className="form-grid" onSubmit={addCrop}><label>{t.crop} *<input required value={cropForm.nombre} onChange={e=>setCropForm({...cropForm,nombre:e.target.value})} placeholder="Ej. papa, maíz, frijol"/></label><label>{t.parcel}<select value={cropForm.parcela_id} onChange={e=>setCropForm({...cropForm,parcela_id:e.target.value})}><option value="">Sin asignar</option>{parcels.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>{t.variety}<input value={cropForm.variedad} onChange={e=>setCropForm({...cropForm,variedad:e.target.value})}/></label><label>{t.areaHa} *<input required min="0.01" step="0.01" type="number" value={cropForm.superficie_ha} onChange={e=>setCropForm({...cropForm,superficie_ha:e.target.value})}/></label><label>{t.planting}<input type="date" value={cropForm.fecha_siembra} onChange={e=>setCropForm({...cropForm,fecha_siembra:e.target.value})}/></label><label>{t.season}<input value={cropForm.temporada} onChange={e=>setCropForm({...cropForm,temporada:e.target.value})} placeholder="Ej. 2026-2027"/></label><label className="full">{t.notes}<textarea value={cropForm.notas} onChange={e=>setCropForm({...cropForm,notas:e.target.value})}/></label><button className="primary-btn"><Plus size={16}/>{t.addCrop}</button></form></article><article className="panel page-panel"><div className="panel-head"><div><h2>Distribución por cultivo</h2><p>Superficie introducida por el usuario</p></div></div>{distribution.map(c=><div className="dist-row" key={c.nombre}><div><span>{c.nombre}</span><b>{c.superficie_ha} ha</b></div><div className="bar"><i style={{width:`${c.superficie_ha/maxCrop*100}%`}}/></div></div>)}</article><article className="panel page-panel full-span"><h2>Registros guardados</h2><div className="table-wrap"><table><thead><tr><th>Cultivo</th><th>Parcela</th><th>Variedad</th><th>Área</th><th>Siembra</th><th></th></tr></thead><tbody>{crops.map(c=><tr key={c.id}><td>{c.nombre}</td><td>{c.parcela_nombre||"Sin asignar"}</td><td>{c.variedad||"—"}</td><td>{c.superficie_ha} ha</td><td>{c.fecha_siembra||"—"}</td><td><button className="danger-btn" onClick={()=>deleteCrop(c.id)}><Trash2 size={14}/>{t.delete}</button></td></tr>)}</tbody></table>{!crops.length&&<p className="empty-text">{t.noCrops}</p>}</div></article></section>}

        {active==="Clima NASA"&&<section className="panel page-panel"><div className="panel-head"><div><h1>Observaciones meteorológicas NASA POWER</h1><p>Amarilis, Huánuco · {nasa?.coordenadas?.latitud}, {nasa?.coordenadas?.longitud}</p></div><button className="primary-btn" onClick={loadAll}><RefreshCw size={15}/>{t.refresh}</button></div><div className="climate-cards">{[["Temperatura",current.temperatura,"°C","T2M"],["Precipitación",current.precipitacion,"mm/día","PRECTOTCORR"],["Humedad relativa",current.humedad_relativa,"%","RH2M"],["Viento",current.velocidad_viento,"m/s","WS10M"],["Radiación solar",current.radiacion_solar,"kWh/m²/día","ALLSKY_SFC_SW_DWN"]].map(([n,v,u,k])=><div className="metric-card" key={k}><small>{n}</small><b>{v??"--"} {u}</b><span>{k}</span></div>)}</div><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Temp. °C</th><th>Lluvia mm/d</th><th>Humedad %</th><th>Viento m/s</th><th>Radiación kWh/m²/d</th></tr></thead><tbody>{series.map(x=><tr key={x.fecha}><td>{x.fecha}</td><td>{x.temperatura??"—"}</td><td>{x.precipitacion??"—"}</td><td>{x.humedad??"—"}</td><td>{x.viento??"—"}</td><td>{x.radiacion??"—"}</td></tr>)}</tbody></table></div><p className="fine-print">{t.nasaNote} Última fecha disponible: {nasa?.fecha||"—"}.</p><p><a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER <ExternalLink size={13}/></a></p></section>}

        {active==="Suelo y agua"&&<section className="two-col-page"><article className="panel page-panel"><h1>Humedad superficial del suelo · SMAP</h1><p>La misión Soil Moisture Active Passive observa la humedad superficial y contribuye al seguimiento regional del agua en el suelo.</p><div className="info-callout"><Satellite/><div><b>Observación satelital regional</b><p>La capa seleccionada en el mapa es una visualización de NASA GIBS. Su resolución y cobertura no permiten afirmar la humedad exacta de una parcela pequeña.</p></div></div><button className="primary-btn" onClick={()=>{setLayer("smap");setActive("Dashboard");}}>Ver capa SMAP en el mapa</button><p><a href="https://smap.jpl.nasa.gov/" target="_blank" rel="noreferrer">NASA SMAP <ExternalLink size={13}/></a></p></article><article className="panel page-panel"><h2>Evaluación del suelo</h2><div className="soil-placeholder"><FlaskConical size={30}/><div><b>No se calcula un índice inventado</b><p>Para una evaluación real se necesitan análisis locales: pH, textura, materia orgánica, nitrógeno, fósforo, potasio, salinidad y capacidad de retención de agua.</p></div></div><p className="fine-print">SMAP no mide estos parámetros químicos.</p></article></section>}

        {active==="Gemelo digital"&&<section className="panel page-panel"><h1>Gemelo digital agrícola</h1><p>Representación digital inicial que vincula la geometría y superficie registrada de cada parcela con el contexto ambiental disponible.</p><div className="stats twin-stats"><Stat icon={MapIcon} label="Parcelas vinculadas" value={parcels.length} detail="Geometrías guardadas"/><Stat icon={Sprout} label="Registros de cultivo" value={crops.length} detail="Información declarada"/><Stat icon={CloudSun} label="Fuente ambiental" value="NASA POWER" detail="Punto de referencia Amarilis"/></div><div className="table-wrap"><table><thead><tr><th>Parcela</th><th>Área</th><th>Cultivo inicial</th><th>Registros de cultivo</th></tr></thead><tbody>{parcels.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.areaHa} ha</td><td>{p.crop}</td><td>{crops.filter(c=>c.parcela_id===p.id).map(c=>c.nombre).join(", ")||"Sin asignación"}</td></tr>)}</tbody></table></div><p className="fine-print">Un gemelo digital completo a nivel de campo requiere observaciones, historial de manejo, datos de suelo y validación local; esta versión ofrece la base geográfica y ambiental.</p></section>}

        {active==="Análisis de escenarios"&&<section className="two-col-page"><article className="panel page-panel"><h1>Exploración de rotación de cultivos</h1><p>{t.scenariosNote}</p><div className="form-grid"><label>{t.water}<select value={scenario.water} onChange={e=>setScenario({...scenario,water:e.target.value})}><option value="low">Baja</option><option value="moderate">Moderada</option><option value="high">Alta</option><option value="unknown">Por determinar</option></select></label><label>{t.soilCover}<select value={scenario.cover} onChange={e=>setScenario({...scenario,cover:e.target.value})}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label><label>{t.nutrient}<select value={scenario.nutrient} onChange={e=>setScenario({...scenario,nutrient:e.target.value})}><option value="legume">Incluir leguminosa</option><option value="cereal">Cereal</option><option value="mixed">Diversificada</option><option value="unknown">Por determinar</option></select></label><label>{t.feasibility}<select value={scenario.feasibility} onChange={e=>setScenario({...scenario,feasibility:e.target.value})}><option value="review">Requiere revisión</option><option value="yes">Equipo y mercado disponibles</option><option value="no">Limitaciones identificadas</option></select></label></div><div className="info-callout"><BrainCircuit/><div><b>Comparación cualitativa configurada</b><p>Agua: {scenario.water}; cobertura: {scenario.cover}; nutrientes: {scenario.nutrient}; viabilidad: {scenario.feasibility}.</p></div></div></article><article className="panel page-panel"><h2>Qué debe verificarse antes de decidir</h2><ul className="check-list"><li>Historial de cultivos y plagas.</li><li>Análisis de suelo y disponibilidad de agua.</li><li>Fechas de siembra, clima y riesgo de eventos extremos.</li><li>Maquinaria, mano de obra, costos y mercado local.</li><li>Validación con asistencia técnica agronómica.</li></ul><p className="fine-print">El sistema no declara una estrategia ganadora ni genera recomendaciones validadas automáticamente.</p></article></section>}

        {active==="Reportes"&&<section className="panel page-panel"><div className="panel-head"><div><h1>Reportes del proyecto</h1><p>Exporta los registros introducidos en la plataforma.</p></div><button className="primary-btn" onClick={exportCSV}><Download size={16}/>{t.reportDownload}</button></div><div className="stats"><Stat icon={MapIcon} label="Parcelas" value={parcels.length} detail="Registros"/><Stat icon={Sprout} label="Cultivos" value={crops.length} detail="Registros"/><Stat icon={CloudSun} label="Días NASA POWER" value={series.length} detail="Serie consultada"/></div><p className="fine-print">El archivo CSV contiene datos de parcelas y cultivos que hayas registrado. Las variables NASA se consultan en la sección Clima NASA.</p></section>}

        {active==="Historial"&&<section className="panel page-panel"><h1>Historial de actividad</h1><p>Resumen del estado actual de los registros.</p><div className="history-item"><CheckCircle2/><div><b>Consulta NASA POWER</b><small>Último dato disponible: {nasa?.fecha||"No disponible"}</small></div></div><div className="history-item"><MapIcon/><div><b>{parcels.length} parcelas registradas</b><small>Persistencia local SQLite</small></div></div><div className="history-item"><Sprout/><div><b>{crops.length} cultivos registrados</b><small>Superficie declarada: {indicators.superficie_cultivada_ha} ha</small></div></div></section>}
        <footer className="footer"><span>AgroTwin AI · NASA Space Apps Challenge</span><span>Datos y visualizaciones: NASA POWER / NASA GIBS · Mapa base: Esri</span></footer>
      </div>
    </main>
  </div>;
}
export default App;
