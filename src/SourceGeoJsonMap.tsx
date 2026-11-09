import {useEffect, useRef} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {T,useI18n} from './i18n'

type Feature = {
  type: 'Feature'
  geometry: {type: 'Point'|'LineString'|'Polygon'; coordinates: unknown}
  properties?: Record<string, unknown>
}
type FeatureCollection = {type: 'FeatureCollection'; features: Feature[]}

const isCoordinate = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length >= 2 &&
  typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
  typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90

// Only render standard geographic lon/lat GeoJSON geometry; reject malformed
// or out-of-range coordinates rather than crashing the whole source inspector.
function isFeature(value: unknown): value is Feature {
  if (!value || typeof value !== 'object') return false
  const f = value as Record<string, unknown>
  if (f.type !== 'Feature' || !f.geometry || typeof f.geometry !== 'object') return false
  const g = f.geometry as Record<string, unknown>
  if (g.type === 'Point') return isCoordinate(g.coordinates)
  if (g.type === 'LineString') return Array.isArray(g.coordinates) && g.coordinates.length >= 2 && g.coordinates.every(isCoordinate)
  if (g.type === 'Polygon') return Array.isArray(g.coordinates) && g.coordinates.length > 0 &&
    g.coordinates.every(r => Array.isArray(r) && r.length >= 4 && r.every(isCoordinate))
  return false
}
function validCollection(value: unknown): FeatureCollection | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  if (c.type !== 'FeatureCollection' || !Array.isArray(c.features)) return null
  const features = c.features.filter(isFeature).slice(0, 150)
  return features.length ? {type:'FeatureCollection', features} : null
}

export default function SourceGeoJsonMap({geojson,observedAt}:{geojson:unknown;observedAt:string}){
  const {t,locale}=useI18n()
  const containerRef=useRef<HTMLDivElement>(null)
  const mapRef=useRef<L.Map|null>(null)
  const layerRef=useRef<L.GeoJSON|null>(null)
  const hasFitRef=useRef(false)
  useEffect(()=>{
    if (!containerRef.current || mapRef.current) return
    const map=L.map(containerRef.current,{zoomControl:true,scrollWheelZoom:false,attributionControl:true})
    map.setView([32.3,54.3],9)
    mapRef.current=map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; OpenStreetMap contributors',
      maxZoom:18,
    }).addTo(map)
    const resize=new ResizeObserver(()=>map.invalidateSize())
    resize.observe(containerRef.current)
    const handle=requestAnimationFrame(()=>map.invalidateSize())
    return ()=>{
      cancelAnimationFrame(handle)
      resize.disconnect()
      layerRef.current=null
      mapRef.current=null
      hasFitRef.current=false
      map.remove()
    }
  },[])
  useEffect(()=>{
    const map=mapRef.current
    if(!map)return
    if(layerRef.current){map.removeLayer(layerRef.current);layerRef.current=null}
    const data=validCollection(geojson)
    if(!data)return
    const layer=L.geoJSON(data as Parameters<typeof L.geoJSON>[0],{
      style:feature=>{
        const kind=String(feature?.properties?.feature_class??'')
        return {color:kind==='fault'?'#ffbd70':kind==='fracture'?'#62e6e1':'#c1e07d',weight:3,opacity:.95}
      },
      pointToLayer:(_feature,latlng)=>L.circleMarker(latlng,{
        radius:8,color:'#e5faff',weight:2,fillColor:'#48dfb8',fillOpacity:.95,
      }),
      onEachFeature:(feature,item)=>{
        const name=typeof feature.properties?.name==='string'?feature.properties.name:'GIS feature'
        const tooltip=document.createElement('span')
        tooltip.textContent=name
        item.bindTooltip(tooltip)
      },
    }).addTo(map)
    layerRef.current=layer
    if(!hasFitRef.current&&layer.getLayers().length){
      map.fitBounds(layer.getBounds().pad(.25),{maxZoom:13,animate:false})
      hasFitRef.current=true
    }
  },[geojson])
  return <section className="ee-gis-map-panel" aria-label="Received GeoJSON map">
    <div className="ee-gis-map-heading"><div><strong><T>RECEIVED GIS FEATURES</T></strong><span>WGS84 GeoJSON · observed {new Date(observedAt).toLocaleString(locale)}</span></div><span className="ee-gis-map-demo"><T>SYNTHETIC</T></span></div>
    <div ref={containerRef} className="ee-gis-map" role="application" aria-label="Interactive map of received synthetic GIS features"/>
    <div className="ee-gis-map-legend"><span><i className="ee-gis-legend-fault"/> <T>Fault</T></span><span><i className="ee-gis-legend-fracture"/> <T>Fracture</T></span><span><i className="ee-gis-legend-point"/> <T>Intersection</T></span><small><T>Tiles may require an internet connection. Pan/zoom remains under your control during refresh.</T></small></div>
  </section>
}
