import type {
  CreateEmployeeRequest,
  EmployeeDto,
  EmployeeListQuery,
  UpdateEmployeeRequest,
} from './employee.dto'
import type {
  CreateLeaveRequestRequest,
  CreateLeaveTypeRequest,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveRequestListQuery,
  LeaveTypeDto,
  UpdateLeaveRequestRequest,
  UpdateLeaveTypeRequest,
} from './leave.dto'
import type { TimesheetDto, TimesheetListQuery, UpsertTimesheetRequest } from './timesheet.dto'
import type {
  ComputePayrollRequest,
  CreatePayrollRunRequest,
  PayPayslipRequest,
  PayrollParamSetDto,
  PayrollRunDto,
  PayrollRunListQuery,
  PayslipDto,
  UpsertPayrollParamsRequest,
} from './payroll.dto'
import type {
  CreateShiftRequest,
  ShiftDto,
  ShiftListQuery,
  UpdateShiftRequest,
} from './shift.dto'
import type {
  CreateShiftRotationRequest,
  ShiftRotationDto,
  UpdateShiftRotationRequest,
} from './shift-rotation.dto'
import type {
  AssignEmployeeShiftRequest,
  EmployeeShiftAssignmentDto,
  EmployeeShiftDayDto,
  GenerateScheduleRequest,
  GenerateScheduleResult,
  SetShiftDayRequest,
  ShiftAssignmentListQuery,
  ShiftDayListQuery,
  UpdateEmployeeShiftRequest,
} from './shift-schedule.dto'
import type {
  CheckinAreaDto,
  CheckinAreaListQuery,
  CreateCheckinAreaRequest,
  SetAreaEmployeesRequest,
  UpdateCheckinAreaRequest,
} from './checkin-area.dto'
import type {
  AttendanceListQuery,
  AttendanceRecordDto,
  CheckinRequest,
  CheckinResultDto,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
} from './attendance.dto'
import type {
  AttendanceImportRequest,
  CardSourceDto,
  CreateCardSourceRequest,
  CreateEmployeeCardRequest,
  EmployeeCardDto,
  EmployeeCardListQuery,
  AttendanceImportResultDto,
  UpdateCardSourceRequest,
  UpdateEmployeeCardRequest,
} from './card.dto'

export interface IEmployeesService {
  list(query?: EmployeeListQuery): Promise<EmployeeDto[]>
  get(id: string): Promise<EmployeeDto>
  create(input: CreateEmployeeRequest): Promise<EmployeeDto>
  update(id: string, input: UpdateEmployeeRequest): Promise<EmployeeDto>
  remove(id: string): Promise<void>
  /** Annual paid-leave balance for a year (defaults to current year). */
  leaveBalance(id: string, year?: number): Promise<LeaveBalanceDto>
}

export interface ILeaveTypesService {
  list(): Promise<LeaveTypeDto[]>
  create(input: CreateLeaveTypeRequest): Promise<LeaveTypeDto>
  update(id: string, input: UpdateLeaveTypeRequest): Promise<LeaveTypeDto>
  remove(id: string): Promise<void>
}

export interface ILeaveRequestsService {
  list(query?: LeaveRequestListQuery): Promise<LeaveRequestDto[]>
  get(id: string): Promise<LeaveRequestDto>
  create(input: CreateLeaveRequestRequest): Promise<LeaveRequestDto>
  update(id: string, input: UpdateLeaveRequestRequest): Promise<LeaveRequestDto>
  remove(id: string): Promise<void>
  approve(id: string): Promise<LeaveRequestDto>
  reject(id: string): Promise<LeaveRequestDto>
}

export interface ITimesheetsService {
  list(query?: TimesheetListQuery): Promise<TimesheetDto[]>
  /** Upsert the (employee, year, month) row. */
  upsert(input: UpsertTimesheetRequest): Promise<TimesheetDto>
  remove(id: string): Promise<void>
}

export interface IPayrollService {
  listRuns(query?: PayrollRunListQuery): Promise<PayrollRunDto[]>
  getRun(id: string): Promise<PayrollRunDto>
  createRun(input: CreatePayrollRunRequest): Promise<PayrollRunDto>
  removeRun(id: string): Promise<void>
  /** (Re)compute payslips for a draft run from salaries + timesheets + params. */
  compute(runId: string, input?: ComputePayrollRequest): Promise<PayrollRunDto>
  finalize(runId: string): Promise<PayrollRunDto>
  payslips(runId: string): Promise<PayslipDto[]>
  getPayslip(payslipId: string): Promise<PayslipDto>
  /** Post the net salary to finance (kasa/banka, type:'out'). */
  pay(payslipId: string, input: PayPayslipRequest): Promise<PayslipDto>
  unpay(payslipId: string): Promise<PayslipDto>
}

export interface IPayrollParamsService {
  list(): Promise<PayrollParamSetDto[]>
  get(year: number): Promise<PayrollParamSetDto>
  upsert(input: UpsertPayrollParamsRequest): Promise<PayrollParamSetDto>
}

// ── PDKS: vardiya (shift) ─────────────────────────────────────────────────────

export interface IShiftsService {
  list(query?: ShiftListQuery): Promise<ShiftDto[]>
  get(id: string): Promise<ShiftDto>
  create(input: CreateShiftRequest): Promise<ShiftDto>
  update(id: string, input: UpdateShiftRequest): Promise<ShiftDto>
  remove(id: string): Promise<void>
}

export interface IShiftRotationsService {
  list(): Promise<ShiftRotationDto[]>
  get(id: string): Promise<ShiftRotationDto>
  create(input: CreateShiftRotationRequest): Promise<ShiftRotationDto>
  update(id: string, input: UpdateShiftRotationRequest): Promise<ShiftRotationDto>
  remove(id: string): Promise<void>
}

export interface IShiftScheduleService {
  // Assignments (the rule layer)
  listAssignments(query?: ShiftAssignmentListQuery): Promise<EmployeeShiftAssignmentDto[]>
  assign(input: AssignEmployeeShiftRequest): Promise<EmployeeShiftAssignmentDto>
  updateAssignment(id: string, input: UpdateEmployeeShiftRequest): Promise<EmployeeShiftAssignmentDto>
  removeAssignment(id: string): Promise<void>
  // Materialized per-day calendar
  generate(input: GenerateScheduleRequest): Promise<GenerateScheduleResult>
  listDays(query?: ShiftDayListQuery): Promise<EmployeeShiftDayDto[]>
  setDay(input: SetShiftDayRequest): Promise<EmployeeShiftDayDto>
  /** The calling user's own materialized schedule (Employee.userId). */
  mine(from?: string, to?: string): Promise<EmployeeShiftDayDto[]>
}

// ── PDKS: giriş alanları (geofence) ───────────────────────────────────────────

export interface ICheckinAreasService {
  list(query?: CheckinAreaListQuery): Promise<CheckinAreaDto[]>
  get(id: string): Promise<CheckinAreaDto>
  create(input: CreateCheckinAreaRequest): Promise<CheckinAreaDto>
  update(id: string, input: UpdateCheckinAreaRequest): Promise<CheckinAreaDto>
  remove(id: string): Promise<void>
  /** Employees explicitly allowed to check in from this area. */
  listEmployees(id: string): Promise<string[]>
  setEmployees(id: string, input: SetAreaEmployeesRequest): Promise<string[]>
}

// ── PDKS: giriş/çıkış kayıtları ───────────────────────────────────────────────

export interface IAttendanceService {
  list(query?: AttendanceListQuery): Promise<AttendanceRecordDto[]>
  get(id: string): Promise<AttendanceRecordDto>
  /** Mobile self check-in/out — server validates geofence + time + tolerance. */
  checkin(input: CheckinRequest): Promise<CheckinResultDto>
  /** The calling user's own recent records. */
  mine(query?: AttendanceListQuery): Promise<AttendanceRecordDto[]>
  create(input: CreateAttendanceRequest): Promise<AttendanceRecordDto>
  update(id: string, input: UpdateAttendanceRequest): Promise<AttendanceRecordDto>
  remove(id: string): Promise<void>
  /** Import a batch of card-access events (vendor-neutral standard). */
  import(input: AttendanceImportRequest): Promise<AttendanceImportResultDto>
}

// ── PDKS: kartlı geçiş ayarları ───────────────────────────────────────────────

export interface ICardSourcesService {
  list(): Promise<CardSourceDto[]>
  get(id: string): Promise<CardSourceDto>
  create(input: CreateCardSourceRequest): Promise<CardSourceDto>
  update(id: string, input: UpdateCardSourceRequest): Promise<CardSourceDto>
  remove(id: string): Promise<void>
  // Employee↔card mapping
  listCards(query?: EmployeeCardListQuery): Promise<EmployeeCardDto[]>
  createCard(input: CreateEmployeeCardRequest): Promise<EmployeeCardDto>
  updateCard(id: string, input: UpdateEmployeeCardRequest): Promise<EmployeeCardDto>
  removeCard(id: string): Promise<void>
}
