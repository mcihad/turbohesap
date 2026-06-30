import { In, type Repository } from 'typeorm'

import type {
  AttendanceRecordDto,
  CardSourceDto,
  CheckinAreaDto,
  CheckinAreaSummary,
  EmployeeCardDto,
  EmployeeShiftAssignmentDto,
  EmployeeShiftDayDto,
  ShiftDto,
  ShiftRotationDto,
  ShiftSummary,
} from '@turbohesap/shared'

import type { Employee } from './entities/employee.entity'
import type { Shift } from './entities/shift.entity'
import type { ShiftRotation } from './entities/shift-rotation.entity'
import type { EmployeeShift } from './entities/employee-shift.entity'
import type { EmployeeShiftDay } from './entities/employee-shift-day.entity'
import type { CheckinArea } from './entities/checkin-area.entity'
import type { AttendanceRecord } from './entities/attendance-record.entity'
import type { CardSource } from './entities/card-source.entity'
import type { EmployeeCard } from './entities/employee-card.entity'

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null)

export function employeeDisplayName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`.trim()
}

// Batch-load employee display names by id (one query) → Map.
export async function employeeNameMap(
  employees: Repository<Employee>,
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map
  const rows = await employees.find({
    where: { id: In(unique) },
    select: { id: true, firstName: true, lastName: true },
  })
  for (const e of rows) map.set(e.id, employeeDisplayName(e))
  return map
}

export function toShiftSummary(s: Shift): ShiftSummary {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    startTime: s.startTime,
    endTime: s.endTime,
    color: s.color,
    isDayOff: s.isDayOff,
  }
}

export function toShiftDto(s: Shift): ShiftDto {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    startTime: s.startTime,
    endTime: s.endTime,
    crossesMidnight: s.crossesMidnight,
    expectedMinutes: s.expectedMinutes,
    lateGraceMin: s.lateGraceMin,
    earlyLeaveGraceMin: s.earlyLeaveGraceMin,
    earlyInClampMin: s.earlyInClampMin,
    color: s.color,
    isDayOff: s.isDayOff,
    breaks: s.breaks ?? [],
    branchId: s.branchId,
    isActive: s.isActive,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export function toRotationDto(
  r: ShiftRotation,
  shifts: ShiftSummary[] = [],
): ShiftRotationDto {
  return {
    id: r.id,
    name: r.name,
    cycleLengthDays: r.cycleLengthDays,
    anchorDate: r.anchorDate,
    days: r.days ?? [],
    shifts,
    description: r.description,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toAssignmentDto(
  a: EmployeeShift,
  employeeName: string,
  rotationName: string | null,
  fixedShift: ShiftSummary | null,
): EmployeeShiftAssignmentDto {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employeeName,
    rotationId: a.rotationId,
    rotationName,
    rotationOffset: a.rotationOffset,
    fixedShiftId: a.fixedShiftId,
    fixedShift,
    effectiveFrom: a.effectiveFrom,
    effectiveTo: a.effectiveTo,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

export function toShiftDayDto(
  d: EmployeeShiftDay,
  employeeName: string,
  shift: ShiftSummary | null,
): EmployeeShiftDayDto {
  return {
    id: d.id,
    employeeId: d.employeeId,
    employeeName,
    workDate: d.workDate,
    shiftId: d.shiftId,
    shift,
    source: d.source,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

export function toAreaSummary(a: CheckinArea): CheckinAreaSummary {
  return { id: a.id, name: a.name, code: a.code }
}

export function toAreaDto(a: CheckinArea, employeeCount = 0): CheckinAreaDto {
  return {
    id: a.id,
    name: a.name,
    code: a.code,
    branchId: a.branchId,
    geom: a.geom,
    toleranceMeters: a.toleranceMeters,
    minAccuracyMeters: a.minAccuracyMeters,
    timeWindows: a.timeWindows ?? [],
    attributes: a.attributes ?? {},
    requireInside: a.requireInside,
    allowMockLocation: a.allowMockLocation,
    isActive: a.isActive,
    notes: a.notes,
    employeeCount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

export function toAttendanceDto(
  r: AttendanceRecord,
  employeeName: string | null,
  area: CheckinAreaSummary | null,
): AttendanceRecordDto {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName,
    branchId: r.branchId,
    eventTime: r.eventTime.toISOString(),
    direction: r.direction,
    method: r.method,
    lat: r.lat,
    lng: r.lng,
    accuracyMeters: r.accuracyMeters,
    areaId: r.areaId,
    area,
    distanceMeters: r.distanceMeters,
    withinGeofence: r.withinGeofence,
    withinTimeWindow: r.withinTimeWindow,
    isMockLocation: r.isMockLocation,
    status: r.status,
    flagReason: r.flagReason,
    cardNo: r.cardNo,
    source: r.source,
    externalId: r.externalId,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toCardSourceDto(s: CardSource, hasApiKey: boolean): CardSourceDto {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    kind: s.kind,
    description: s.description,
    config: s.config ?? {},
    timezone: s.timezone,
    directionMapping: s.directionMapping ?? {},
    hasApiKey,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export function toEmployeeCardDto(c: EmployeeCard, employeeName: string): EmployeeCardDto {
  return {
    id: c.id,
    employeeId: c.employeeId,
    employeeName,
    cardNo: c.cardNo,
    externalPersonnelId: c.externalPersonnelId,
    validFrom: c.validFrom,
    validTo: c.validTo,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

// Re-export so callers can keep imports tidy.
export { iso as toIso }
