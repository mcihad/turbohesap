// İK & Bordro permission keys.
export const HrPermissions = {
  read: 'hr.read',
  write: 'hr.write',
  /** Create/compute/finalize payroll runs. */
  payroll: 'hr.payroll',
  /** Post salary payments to finance. */
  pay: 'hr.pay',
  /** Approve/reject leave requests. */
  approve: 'hr.approve',
  /** Edit yearly payroll parameters (rates/brackets/minimum wage). */
  params: 'hr.params',

  // ── PDKS (vardiya + giriş/çıkış + kartlı geçiş) ──────────────────────────────
  /** View shift definitions, rotations and the schedule. */
  shiftsRead: 'hr.shifts.read',
  /** Create/edit shift definitions and rotations. */
  shiftsWrite: 'hr.shifts.write',
  /** Assign employees to shifts/rotations and edit the calendar. */
  shiftsAssign: 'hr.shifts.assign',
  /** View check-in areas (geofences). */
  areasRead: 'hr.areas.read',
  /** Draw/edit check-in area geometry and settings. */
  areasWrite: 'hr.areas.write',
  /** Assign which employees may check in from which areas. */
  areasAssign: 'hr.areas.assign',
  /** View attendance (check-in/out) records. */
  attendanceRead: 'hr.attendance.read',
  /** Self check-in/out from the mobile app. */
  attendanceCheckin: 'hr.attendance.checkin',
  /** Manually add/edit/delete and resolve flagged attendance records. */
  attendanceManage: 'hr.attendance.manage',
  /** View card-access sources and employee card mappings. */
  cardsRead: 'hr.cards.read',
  /** Edit card sources/settings and employee card mappings. */
  cardsWrite: 'hr.cards.write',
  /** Import card-access event batches. */
  cardsImport: 'hr.cards.import',
} as const

export type HrPermission = (typeof HrPermissions)[keyof typeof HrPermissions]
