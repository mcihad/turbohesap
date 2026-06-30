// Giriş alanı (geofence) geometri editörü — web'deki OpenLayers editörünün RN
// karşılığı. Tek bir geometri (Polygon veya Point) çizdirir/düzenler. Temel harita
// web ile aynı OpenStreetMap karolarıdır (UrlTile). Geometri GeoJSON (SRID 4326,
// [lon,lat]) olarak parent forma taşınır; react-native-maps {latitude,longitude}
// kullandığı için her iki yönde dönüşüm yapılır.
import * as React from 'react'
import { Alert, Platform, Pressable, View } from 'react-native'
import MapView, {
  Circle,
  Marker,
  Polygon,
  PROVIDER_DEFAULT,
  UrlTile,
  type LatLng,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
  type Region,
} from 'react-native-maps'
import * as Location from 'expo-location'

import type { GeoJsonGeometry } from '@turbohesap/shared'

import { Button, Icon, SegmentedControl, Text, withAlpha } from '../../../../components'
import { useTheme } from '../../../../theme/theme-context'

type Mode = 'Polygon' | 'Point'

// İstanbul — geometri yokken varsayılan merkez.
const ISTANBUL: Region = {
  latitude: 41.0,
  longitude: 29.0,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Bir GeoJSON geometriden uygun harita bölgesini hesaplar. */
function regionFor(verts: LatLng[], pt: LatLng | null): Region | null {
  const pts = pt ? [pt] : verts
  if (pts.length === 0) return null
  const lats = pts.map((p) => p.latitude)
  const lons = pts.map((p) => p.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.008),
    longitudeDelta: Math.max((maxLon - minLon) * 1.6, 0.008),
  }
}

export function AreaGeometryEditor({
  value,
  onChange,
  toleranceMeters,
}: {
  value: GeoJsonGeometry | null
  onChange: (geom: GeoJsonGeometry | null) => void
  /** Nokta modunda yarıçapı gösteren dairenin metre cinsinden değeri. */
  toleranceMeters: number
}) {
  const t = useTheme()
  const mapRef = React.useRef<MapView | null>(null)
  // Hem dışarı emit ettiğimiz hem de dışarıdan gelen (value) geometriyi karşılaştırarak
  // geri-besleme döngüsünü engellemek için son senkron edilen değeri tutarız.
  const lastSync = React.useRef<string>('')
  const pendingRegion = React.useRef<Region | null>(null)

  const [mode, setMode] = React.useState<Mode>('Polygon')
  const [vertices, setVertices] = React.useState<LatLng[]>([])
  const [point, setPoint] = React.useState<LatLng | null>(null)

  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // İç durumdan GeoJSON üret (poligon halkasını ilk noktayı ekleyerek kapatır).
  const buildGeom = React.useCallback((): GeoJsonGeometry | null => {
    if (mode === 'Point') {
      if (!point) return null
      return { type: 'Point', coordinates: [point.longitude, point.latitude] }
    }
    if (vertices.length < 3) return null
    const ring = vertices.map((v) => [v.longitude, v.latitude] as [number, number])
    ring.push(ring[0])
    return { type: 'Polygon', coordinates: [ring] }
  }, [mode, point, vertices])

  // Dışarıdan gelen value'yu (örn. düzenlemede hidrasyon) iç duruma yükle.
  React.useEffect(() => {
    const incoming = JSON.stringify(value ?? null)
    if (incoming === lastSync.current) return
    lastSync.current = incoming
    if (!value) {
      setVertices([])
      setPoint(null)
      return
    }
    if (value.type === 'Point') {
      setMode('Point')
      const c: LatLng = { latitude: value.coordinates[1], longitude: value.coordinates[0] }
      setPoint(c)
      pendingRegion.current = regionFor([], c)
    } else {
      setMode('Polygon')
      const ring = value.coordinates[0] ?? []
      const pts = ring.slice()
      // Kapanış için tekrarlanan ilk noktayı düzenlenebilir köşelerden çıkar.
      if (
        pts.length > 1 &&
        pts[0][0] === pts[pts.length - 1][0] &&
        pts[0][1] === pts[pts.length - 1][1]
      ) {
        pts.pop()
      }
      const verts = pts.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))
      setVertices(verts)
      pendingRegion.current = regionFor(verts, null)
    }
  }, [value])

  // İç durum değiştikçe geometriyi parent'a taşı (kendi yankımızı atlayarak).
  React.useEffect(() => {
    const geom = buildGeom()
    const key = JSON.stringify(geom)
    if (key === lastSync.current) return
    lastSync.current = key
    onChangeRef.current(geom)
  }, [buildGeom])

  // Yüklenen geometri için haritayı ortala (harita hazır olunca da tetiklenir).
  const consumePending = React.useCallback(() => {
    if (pendingRegion.current && mapRef.current) {
      mapRef.current.animateToRegion(pendingRegion.current, 0)
      pendingRegion.current = null
    }
  }, [])
  React.useEffect(() => {
    consumePending()
  })

  const onMapPress = (e: MapPressEvent) => {
    const c = e.nativeEvent.coordinate
    if (mode === 'Point') setPoint(c)
    else setVertices((v) => [...v, c])
  }

  const onVertexDrag = (i: number, e: MarkerDragStartEndEvent) => {
    const c = e.nativeEvent.coordinate
    setVertices((v) => v.map((p, idx) => (idx === i ? c : p)))
  }

  const removeLast = () => setVertices((v) => v.slice(0, -1))
  const clearAll = () => {
    setVertices([])
    setPoint(null)
  }

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Konum izni', 'Konumunuza erişim izni verilmedi.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      const c: LatLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
      mapRef.current?.animateToRegion(
        { ...c, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        300,
      )
      if (mode === 'Point') setPoint(c)
    } catch {
      Alert.alert('Konum alınamadı', 'Mevcut konum belirlenemedi.')
    }
  }

  const stroke = t.colors.primary
  const fill = withAlpha(t.colors.primary, 0.15)

  return (
    <View style={{ gap: t.spacing[2.5] }}>
      <SegmentedControl<Mode>
        options={[
          { value: 'Polygon', label: 'Poligon', icon: 'hexagon' },
          { value: 'Point', label: 'Nokta', icon: 'map-pin' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <View
        style={{
          height: 320,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          overflow: 'hidden',
        }}
      >
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          // mapType "none" (sadece OSM karoları) yalnızca Android'de desteklenir;
          // iOS'ta Apple Maps "none"u desteklemez ve harita boş kalır → iOS'ta
          // "standard" taban üzerine OSM karoları bindirilir.
          mapType={Platform.OS === 'android' ? 'none' : 'standard'}
          style={{ flex: 1 }}
          initialRegion={ISTANBUL}
          onMapReady={consumePending}
          onPress={onMapPress}
        >
          <UrlTile
            urlTemplate={OSM_URL}
            maximumZ={19}
            flipY={false}
            // iOS'ta OSM karolarının Apple tabanını örtmesi için üstte tut.
            zIndex={Platform.OS === 'ios' ? 1 : 0}
            shouldReplaceMapContent
          />


          {mode === 'Polygon' && vertices.length >= 2 ? (
            <Polygon
              coordinates={vertices}
              strokeColor={stroke}
              strokeWidth={2}
              fillColor={fill}
            />
          ) : null}

          {mode === 'Polygon'
            ? vertices.map((v, i) => (
                <Marker
                  key={`v-${i}`}
                  coordinate={v}
                  draggable
                  anchor={{ x: 0.5, y: 0.5 }}
                  onDragEnd={(e) => onVertexDrag(i, e)}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: t.radius.full,
                      backgroundColor: t.colors.primary,
                      borderWidth: 2,
                      borderColor: t.colors.primaryForeground,
                    }}
                  />
                </Marker>
              ))
            : null}

          {mode === 'Point' && point ? (
            <>
              <Circle
                center={point}
                radius={Math.max(toleranceMeters, 1)}
                strokeColor={stroke}
                strokeWidth={2}
                fillColor={fill}
              />
              <Marker
                coordinate={point}
                draggable
                anchor={{ x: 0.5, y: 0.5 }}
                onDragEnd={(e) => setPoint(e.nativeEvent.coordinate)}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: t.radius.full,
                    backgroundColor: t.colors.primary,
                    borderWidth: 3,
                    borderColor: t.colors.primaryForeground,
                  }}
                />
              </Marker>
            </>
          ) : null}
        </MapView>
      </View>

      <Text variant="caption" tone="muted">
        © OpenStreetMap katkıda bulunanlar
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
        <Button title="Konumumu kullan" icon="crosshair" variant="outline" size="sm" onPress={useMyLocation} />
        {mode === 'Polygon' ? (
          <Button
            title="Son noktayı sil"
            icon="rotate-ccw"
            variant="outline"
            size="sm"
            onPress={removeLast}
          />
        ) : null}
        <Button title="Temizle" icon="trash-2" variant="outline" size="sm" onPress={clearAll} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
        <Icon name="info" size={14} color={t.colors.mutedForeground} />
        <Text variant="caption" tone="muted" style={{ flex: 1 }}>
          {mode === 'Polygon'
            ? 'Haritaya dokunarak köşe ekleyin; köşeleri sürükleyerek düzenleyin (en az 3 köşe).'
            : 'Haritaya dokunarak merkezi belirleyin; işareti sürükleyerek taşıyın.'}
        </Text>
      </View>
    </View>
  )
}
