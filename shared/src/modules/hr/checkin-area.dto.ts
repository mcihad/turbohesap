// Giriş alanı (check-in area) — a geofence used to validate mobile check-in. The
// geometry is stored in PostGIS as `geom geometry(Geometry,4326)` and carried over
// the wire as GeoJSON. It may be a Polygon (a drawn building/site boundary) or a
// Point (a center used with `toleranceMeters` as a radius). Validation server-side
// is `ST_DWithin(geom::geography, point::geography, toleranceMeters)`.

// Minimal GeoJSON geometry shapes we accept/return (lon/lat, SRID 4326).
export interface GeoJsonPoint {
  type: 'Point'
  /** [lon, lat] */
  coordinates: [number, number]
}
export interface GeoJsonPolygon {
  type: 'Polygon'
  /** Array of linear rings; each ring is [lon, lat][] with the first/last equal. */
  coordinates: [number, number][][]
}
export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon

// One allowed time window. `dow` (1=Mon … 7=Sun) optional → all days. Empty
// `timeWindows` on the area = check-in allowed at any time.
export interface CheckinTimeWindow {
  dow?: number[]
  /** "HH:MM" local time. */
  from: string
  to: string
}

export interface CheckinAreaDto {
  id: string
  name: string
  code: string
  branchId: string | null
  /** GeoJSON Polygon or Point (SRID 4326). */
  geom: GeoJsonGeometry | null
  /** Outward buffer for a polygon / radius for a point, in meters. */
  toleranceMeters: number
  /** Reject GPS fixes whose accuracy is worse than this (meters). */
  minAccuracyMeters: number
  timeWindows: CheckinTimeWindow[]
  /** Free-form geometry attributes (öznitelikler) editable on the map. */
  attributes: Record<string, unknown>
  /** Require the point to be inside the geofence to count as valid. */
  requireInside: boolean
  /** Accept reported mock locations (default false → flagged). */
  allowMockLocation: boolean
  isActive: boolean
  notes: string | null
  /** Number of employees explicitly assigned to this area. */
  employeeCount: number
  createdAt: string
  updatedAt: string
}

export interface CheckinAreaSummary {
  id: string
  name: string
  code: string
}

export interface CreateCheckinAreaRequest {
  name: string
  code?: string
  branchId?: string | null
  geom?: GeoJsonGeometry | null
  toleranceMeters?: number
  minAccuracyMeters?: number
  timeWindows?: CheckinTimeWindow[]
  attributes?: Record<string, unknown>
  requireInside?: boolean
  allowMockLocation?: boolean
  isActive?: boolean
  notes?: string | null
}

export type UpdateCheckinAreaRequest = Partial<CreateCheckinAreaRequest>

export interface SetAreaEmployeesRequest {
  employeeIds: string[]
}

export interface CheckinAreaListQuery {
  branchId?: string
  isActive?: boolean
  employeeId?: string
}
