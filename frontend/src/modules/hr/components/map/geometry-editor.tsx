// OpenLayers geometri editörü — giriş alanı (geofence) için tek bir feature (Polygon
// veya Point) çizdirir/düzenler. Geometri GeoJSON (EPSG:4326) olarak dışarı taşınır;
// haritada EPSG:3857 ile gösterilir. Çizim/Düzenle/Sil araçları üst barda.
import * as React from 'react'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Draw from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Snap from 'ol/interaction/Snap'
import { fromLonLat } from 'ol/proj'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import type { Geometry } from 'ol/geom'

import type { GeoJsonGeometry } from '@turbohesap/shared'

import { Button } from '@/components/ui/button'
import { MapPin, Pentagon, Pencil, Trash2 } from 'lucide-react'

const geoJson = new GeoJSON()
const DATA_PROJ = 'EPSG:4326'
const VIEW_PROJ = 'EPSG:3857'

const featureStyle = new Style({
  fill: new Fill({ color: 'rgba(37, 99, 235, 0.15)' }),
  stroke: new Stroke({ color: '#2563eb', width: 2 }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: '#2563eb' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
})

type Tool = 'none' | 'Polygon' | 'Point'

export function GeometryEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: GeoJsonGeometry | null
  onChange: (geom: GeoJsonGeometry | null) => void
  readOnly?: boolean
}) {
  const mapElRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<Map | null>(null)
  const sourceRef = React.useRef<VectorSource | null>(null)
  const drawRef = React.useRef<Draw | null>(null)
  const modifyRef = React.useRef<Snap | Modify | null>(null)
  const snapRef = React.useRef<Snap | null>(null)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  const [tool, setTool] = React.useState<Tool>('none')

  // Lift the source's single feature up as GeoJSON (EPSG:4326).
  const emit = React.useCallback(() => {
    const source = sourceRef.current
    if (!source) return
    const feats = source.getFeatures()
    if (feats.length === 0) {
      onChangeRef.current(null)
      return
    }
    const obj = geoJson.writeFeatureObject(feats[0], {
      dataProjection: DATA_PROJ,
      featureProjection: VIEW_PROJ,
    }) as unknown as { geometry?: GeoJsonGeometry }
    if (obj.geometry) onChangeRef.current(obj.geometry)
  }, [])

  // One-time map init.
  React.useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const source = new VectorSource()
    sourceRef.current = source
    const vector = new VectorLayer({ source, style: featureStyle })

    const map = new Map({
      target: mapElRef.current,
      layers: [new TileLayer({ source: new OSM() }), vector],
      view: new View({
        center: fromLonLat([29.0, 41.0]),
        zoom: 11,
      }),
    })
    mapRef.current = map

    if (!readOnly) {
      const modify = new Modify({ source })
      modify.on('modifyend', emit)
      map.addInteraction(modify)
      modifyRef.current = modify
      const snap = new Snap({ source })
      map.addInteraction(snap)
      snapRef.current = snap
    }

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      sourceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  // Load incoming value into the source (only when it differs from what's drawn).
  React.useEffect(() => {
    const source = sourceRef.current
    const map = mapRef.current
    if (!source || !map) return

    const current = source.getFeatures()
    const currentGeom =
      current.length > 0
        ? (geoJson.writeFeatureObject(current[0], {
            dataProjection: DATA_PROJ,
            featureProjection: VIEW_PROJ,
          }) as unknown as { geometry?: GeoJsonGeometry }).geometry ?? null
        : null

    if (JSON.stringify(currentGeom) === JSON.stringify(value ?? null)) return

    source.clear()
    if (value) {
      const feats = geoJson.readFeatures(
        { type: 'Feature', geometry: value, properties: {} },
        { dataProjection: DATA_PROJ, featureProjection: VIEW_PROJ },
      )
      source.addFeatures(feats)
      const geom = feats[0]?.getGeometry() as Geometry | undefined
      if (geom) {
        map.getView().fit(geom.getExtent(), { padding: [40, 40, 40, 40], maxZoom: 17 })
      }
    }
  }, [value])

  // Switch the active draw tool.
  React.useEffect(() => {
    const map = mapRef.current
    const source = sourceRef.current
    if (!map || !source || readOnly) return

    if (drawRef.current) {
      map.removeInteraction(drawRef.current)
      drawRef.current = null
    }
    if (tool === 'none') return

    const draw = new Draw({ source, type: tool })
    draw.on('drawstart', () => {
      // Only one geometry per area — clear any previous shape.
      source.clear()
    })
    draw.on('drawend', () => {
      setTool('none')
      // emit after the feature is added to the source
      window.setTimeout(emit, 0)
    })
    map.addInteraction(draw)
    drawRef.current = draw
  }, [tool, readOnly, emit])

  const clearAll = () => {
    sourceRef.current?.clear()
    setTool('none')
    onChangeRef.current(null)
  }

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tool === 'Polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(tool === 'Polygon' ? 'none' : 'Polygon')}
          >
            <Pentagon className="size-4" />
            Poligon çiz
          </Button>
          <Button
            type="button"
            variant={tool === 'Point' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(tool === 'Point' ? 'none' : 'Point')}
          >
            <MapPin className="size-4" />
            Nokta çiz
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTool('none')}
            title="Köşeleri düzenle (haritada sürükle)"
          >
            <Pencil className="size-4" />
            Düzenle
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="size-4 text-destructive" />
            Sil
          </Button>
        </div>
      ) : null}
      <div
        ref={mapElRef}
        className="h-80 w-full overflow-hidden rounded-lg border border-border"
      />
      <p className="text-2xs text-muted-foreground">
        Poligon için her köşeye tıklayın, çift tıkla bitirin. Köşeleri sürükleyerek
        düzenleyebilirsiniz.
      </p>
    </div>
  )
}
