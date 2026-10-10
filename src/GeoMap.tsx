import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { targets } from './mockData'

type Target = (typeof targets)[number]
type Props = {
  onSelect?: (target: Target) => void
  layers?: Record<string, boolean>
  selectedId?: string
}

/** Demo geography: invented target locations spread across central Iran.
 * These are NOT known mineral occurrences or permitted exploration licenses.
 */
const demoBounds: L.LatLngBoundsExpression = [[31.92, 53.35], [33.05, 55.18]]
const targetPosition = (t: Target): [number, number] => [
  33.05 - (t.y / 100) * (33.05 - 31.92),
  53.35 + (t.x / 100) * (55.18 - 53.35),
]

export default function GeoMap({ onSelect, layers, selectedId }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const overlayRef = useRef<L.LayerGroup | null>(null)
  const callbackRef = useRef(onSelect)
  callbackRef.current = onSelect

  useEffect(() => {
    if (!container.current || mapRef.current) return
    const map = L.map(container.current, { zoomControl: true, scrollWheelZoom: false })
    map.fitBounds(demoBounds)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)
    const group = L.layerGroup().addTo(map)
    overlayRef.current = group
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(container.current)
    requestAnimationFrame(() => map.invalidateSize())
    return () => {
      resize.disconnect()
      overlayRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const group = overlayRef.current
    if (!group) return
    group.clearLayers()
    const show = (name: string) => layers?.[name] !== false

    if (show('Geology')) {
      L.polygon([
        [32.95, 53.72], [32.85, 54.24], [32.44, 54.48], [32.31, 54.03], [32.6, 53.65],
      ], { color: '#c29f61', weight: 2, fillColor: '#c29f61', fillOpacity: 0.17, dashArray: '7 5' })
        .bindTooltip('Simulated geological unit', { sticky: true }).addTo(group)
    }
    if (show('Structures')) {
      L.polyline([[32.95, 53.70], [32.67, 54.03], [32.39, 54.38], [32.04, 54.82]],
        { color: '#f5b46d', weight: 3, dashArray: '8 6' })
        .bindTooltip('Illustrative fault trace', { sticky: true }).addTo(group)
    }
    if (show('Magnetics')) {
      L.circle([32.73, 54.52], { radius: 13000, color: '#8fdaaa', weight: 2, fillOpacity: 0.12 })
        .bindTooltip('Synthetic magnetic anomaly', { sticky: true }).addTo(group)
    }
    if (show('Geochemistry')) {
      for (const t of targets.slice(0, 3)) {
        L.circle(targetPosition(t), { radius: 4500, weight: 1, color: '#e4b361', fillOpacity: 0.1 })
          .bindTooltip('Synthetic geochemistry footprint', { sticky: true }).addTo(group)
      }
    }
    if (show('Drillholes')) {
      for (const [i, t] of targets.slice(0, 3).entries()) {
        L.circleMarker([targetPosition(t)[0] - 0.025, targetPosition(t)[1] + 0.024],
          { radius: 5, weight: 2, color: '#e9f0e7', fillColor: '#253c2f', fillOpacity: 1 })
          .bindTooltip('Illustrative drill collar DH-02' + (i + 1)).addTo(group)
      }
    }
    if (show('Prospectivity')) {
      for (const t of targets) {
        const color = t.priority === 'Very High' ? '#58d4a4' : t.priority === 'High' ? '#f1be66' : '#acc29a'
        const icon = L.divIcon({
          className: 'mineral-pin-wrap',
          html: `<div class="mineral-map-pin" style="--pin-color:${color}"><strong>${t.aiScore}</strong><span>${t.id}</span></div>`,
          iconSize: [54, 56],
          iconAnchor: [27, 28],
        })
        const marker = L.marker(targetPosition(t), { icon, title: t.name })
          .bindTooltip(`${t.name} · ${t.commodity} (demo)`, { direction: 'top' })
        marker.on('click', () => callbackRef.current?.(t))
        marker.addTo(group)
      }
    }
  }, [layers, selectedId])

  useEffect(() => {
    const target = targets.find(t => t.id === selectedId)
    if (target && mapRef.current) {
      // Move only on inspector selection (no automatic zoom while browsing the overview).
      mapRef.current.panTo(targetPosition(target), { animate: true })
    }
  }, [selectedId])

  return <div className="geo-map-shell">
    <div ref={container} className="geo-map" role="application" aria-label="Interactive OpenStreetMap base map with synthetic mineral exploration targets" />
    <div className="geo-map-label"><strong>INTERACTIVE MAP</strong><span>Central Iran · fictional target positions</span></div>
    <div className="geo-map-legend"><i /> Target score <span>·</span> Scroll zoom disabled; use + / −</div>
  </div>
}
