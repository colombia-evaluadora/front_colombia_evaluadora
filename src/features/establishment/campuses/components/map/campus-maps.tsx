import { useEffect, useRef, useState, type ReactNode } from "react"
import L from "leaflet"
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet"
import "@geoman-io/leaflet-geoman-free"
import "leaflet/dist/leaflet.css"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"

import { Button } from "@/components/ui/button"
import { MapPinIcon, PencilIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { env } from "@/config/env"
import { cn } from "@/lib/utils"

import {
  COLOMBIA_CENTER,
  fromInfluenceArea,
  toInfluenceArea,
  type InfluenceArea,
  type LatLng,
} from "@/features/establishment/campuses/lib/geo"

/** Zoom de una sede ya ubicada (calle) y del país entero (sin ubicación). */
const ZOOM_CAMPUS = 16
const ZOOM_COUNTRY = 5

// Pin propio: el ícono por defecto de Leaflet busca imágenes que el bundler no publica.
const PIN_ICON = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 24 24" width="32" height="32" style="color: var(--red); filter: drop-shadow(0 1px 1px rgb(0 0 0 / .35))"><path fill="currentColor" stroke="white" stroke-width="1.2" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30],
})

const AREA_STYLE: L.PathOptions = { color: "var(--primary)", weight: 2, fillColor: "var(--primary)", fillOpacity: 0.18 }

/** Mapa base: mosaicos de OSM (o del proveedor de `MAP_TILES_URL`) con su crédito, zoom arriba a la derecha. */
function BaseMap({
  center,
  zoom,
  children,
  hint,
  label,
}: {
  center: LatLng
  zoom: number
  children: ReactNode
  hint?: string
  label: string
}) {
  return (
    // `isolate`: las capas de Leaflet (z-index 400+) no tapan el encabezado fijo ni los diálogos.
    <div className="relative isolate h-64 overflow-hidden rounded-lg border border-border" role="region" aria-label={label}>
      <MapContainer center={center} zoom={zoom} zoomControl={false} scrollWheelZoom={false} className="size-full">
        <TileLayer url={env.MAP_TILES_URL} attribution={env.MAP_TILES_ATTRIBUTION} />
        <ZoomControl position="topright" />
        {children}
      </MapContainer>
      {hint ? (
        <span className="pointer-events-none absolute right-2 bottom-6 z-[1000] rounded-md border border-border bg-background/90 px-2 py-1 text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/** Vuelve a centrar el mapa cuando el punto cambia desde afuera (p. ej. al ubicar con la dirección). */
function FollowLocation({ location, version }: { location: LatLng | null; version: number }) {
  const map = useMap()
  useEffect(() => {
    if (location && version > 0) map.setView(location, Math.max(map.getZoom(), ZOOM_CAMPUS))
    // Solo cuando `version` cambia: arrastrar el punto no debe mover el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
  return null
}

function ClickToPlace({ enabled, onPlace }: { enabled: boolean; onPlace: (location: LatLng) => void }) {
  useMapEvents({
    click: (event) => {
      if (enabled) onPlace([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

interface LocationMapProps {
  value: LatLng | null
  onChange: (location: LatLng) => void
  /** Ubicar con la dirección; sin él no se muestra el botón (solo lectura). */
  onLocate?: () => void
  locating?: boolean
  disabled?: boolean
  /** Sube cada vez que el punto cambia desde afuera, para recentrar el mapa. */
  recenterVersion?: number
  /** Qué se ubica, para los textos del mapa (matrícula lo usa para el domicilio). */
  placeLabel?: string
}

/** Ubicación de la sede (Regla 89): un punto que se arrastra; sin punto, se marca con un clic. */
export function CampusLocationMap({
  value,
  onChange,
  onLocate,
  locating = false,
  disabled = false,
  recenterVersion = 0,
  placeLabel = "la sede",
}: LocationMapProps) {
  const editable = !disabled
  const hint = !editable ? undefined : value ? "Arrastre el punto para corregirlo" : `Haga clic en el mapa para marcar ${placeLabel}`
  return (
    <div className="flex flex-col gap-2">
      <BaseMap center={value ?? COLOMBIA_CENTER} zoom={value ? ZOOM_CAMPUS : ZOOM_COUNTRY} hint={hint} label={`Mapa de la ubicación de ${placeLabel}`}>
        <FollowLocation location={value} version={recenterVersion} />
        <ClickToPlace enabled={editable} onPlace={onChange} />
        {value ? (
          <Marker
            position={value}
            icon={PIN_ICON}
            draggable={editable}
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng()
                onChange([lat, lng])
              },
            }}
          />
        ) : null}
      </BaseMap>
      {onLocate && editable ? (
        <div>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={onLocate} disabled={locating} aria-busy={locating}>
            {locating ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <MapPinIcon data-icon="inline-start" />}
            Ubicar con la dirección
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** El polígono, dibujado y editado con leaflet-geoman (sin cruces, Regla 89). */
function AreaEditor({
  value,
  onChange,
  editable,
  drawing,
  onDrawingChange,
  onIntersect,
}: {
  value: InfluenceArea | null
  onChange: (area: InfluenceArea | null) => void
  editable: boolean
  drawing: boolean
  onDrawingChange: (drawing: boolean) => void
  onIntersect: () => void
}) {
  const map = useMap()
  const layerRef = useRef<L.Polygon | null>(null)
  const fitted = useRef(false)
  const callbacks = useRef({ onChange, onDrawingChange, onIntersect })
  callbacks.current = { onChange, onDrawingChange, onIntersect }

  useEffect(() => {
    map.pm.setLang("es")
    map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: false, pathOptions: AREA_STYLE })
    const handleCreate = (event: { layer: L.Layer }) => {
      const drawn = event.layer as L.Polygon
      const vertices = (drawn.getLatLngs()[0] as L.LatLng[]).map((p) => [p.lat, p.lng] as LatLng)
      // Lo pinta el efecto de abajo desde el valor: la capa del dibujo se descarta.
      drawn.remove()
      callbacks.current.onDrawingChange(false)
      callbacks.current.onChange(toInfluenceArea(vertices))
    }
    const handleDrawEnd = () => callbacks.current.onDrawingChange(false)
    map.on("pm:create", handleCreate)
    map.on("pm:drawend", handleDrawEnd)
    return () => {
      map.off("pm:create", handleCreate)
      map.off("pm:drawend", handleDrawEnd)
      if (map.pm.globalDrawModeEnabled()) map.pm.disableDraw()
    }
  }, [map])

  useEffect(() => {
    if (drawing) map.pm.enableDraw("Polygon")
    else if (map.pm.globalDrawModeEnabled()) map.pm.disableDraw()
  }, [drawing, map])

  // El valor manda: se pinta (o se quita) el polígono y, si se puede editar, se habilitan sus vértices.
  useEffect(() => {
    const vertices = fromInfluenceArea(value)
    if (vertices.length < 3) {
      layerRef.current?.remove()
      layerRef.current = null
      return
    }
    const current = layerRef.current
    const same =
      current != null &&
      JSON.stringify((current.getLatLngs()[0] as L.LatLng[]).map((p) => [Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6))])) ===
        JSON.stringify(vertices)
    if (!same) {
      current?.remove()
      layerRef.current = L.polygon(vertices, AREA_STYLE).addTo(map)
    }
    const layer = layerRef.current as L.Polygon
    if (!fitted.current) {
      fitted.current = true
      map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: ZOOM_CAMPUS })
    }
    if (editable) layer.pm.enable({ allowSelfIntersection: false })
    else layer.pm.disable()
    const handleEdit = () => {
      const edited = (layer.getLatLngs()[0] as L.LatLng[]).map((p) => [p.lat, p.lng] as LatLng)
      callbacks.current.onChange(toInfluenceArea(edited))
    }
    const handleIntersect = () => callbacks.current.onIntersect()
    layer.on("pm:edit", handleEdit)
    layer.on("pm:intersect", handleIntersect)
    return () => {
      layer.off("pm:edit", handleEdit)
      layer.off("pm:intersect", handleIntersect)
    }
  }, [value, editable, map])

  useEffect(
    () => () => {
      layerRef.current?.remove()
      layerRef.current = null
    },
    [],
  )

  return null
}

interface AreaMapProps {
  value: InfluenceArea | null
  onChange: (area: InfluenceArea | null) => void
  /** La ubicación de la sede, como referencia (no se mueve desde acá). */
  location: LatLng | null
  disabled?: boolean
}

/** Área de influencia (Regla 89): un polígono opcional que se dibuja y se ajusta en el mapa. */
export function CampusAreaMap({ value, onChange, location, disabled = false }: AreaMapProps) {
  const editable = !disabled
  const [drawing, setDrawing] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const hint = !editable
    ? undefined
    : drawing
      ? "Haga clic en los vértices; cierre en el primero"
      : value
        ? "Arrastre los vértices para ajustarla"
        : undefined
  return (
    <div className="flex flex-col gap-2">
      <BaseMap
        center={location ?? COLOMBIA_CENTER}
        zoom={location ? ZOOM_CAMPUS - 1 : ZOOM_COUNTRY}
        hint={hint}
        label="Mapa del área de influencia de la sede"
      >
        {location ? <Marker position={location} icon={PIN_ICON} interactive={false} /> : null}
        <AreaEditor
          value={value}
          onChange={(area) => {
            setWarning(null)
            onChange(area)
          }}
          editable={editable}
          drawing={drawing}
          onDrawingChange={setDrawing}
          onIntersect={() => setWarning("El área de influencia no puede cruzarse consigo misma.")}
        />
      </BaseMap>
      {warning ? <p className={cn("text-xs text-red")}>{warning}</p> : null}
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={drawing ? "soft" : "outline"}
            color={drawing ? "primary" : "neutral"}
            size="sm"
            onClick={() => {
              setWarning(null)
              setDrawing((current) => !current)
            }}
          >
            <PencilIcon data-icon="inline-start" />
            {drawing ? "Cancelar dibujo" : value ? "Dibujar de nuevo" : "Dibujar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            size="sm"
            disabled={!value || drawing}
            onClick={() => {
              setWarning(null)
              onChange(null)
            }}
          >
            <TrashIcon data-icon="inline-start" />
            Borrar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
