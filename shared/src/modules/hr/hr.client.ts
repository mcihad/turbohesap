import type { AxiosInstance } from 'axios'

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
import type { CreateShiftRequest, ShiftDto, ShiftListQuery, UpdateShiftRequest } from './shift.dto'
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
import type {
  IAttendanceService,
  ICardSourcesService,
  ICheckinAreasService,
  IEmployeesService,
  ILeaveRequestsService,
  ILeaveTypesService,
  IPayrollParamsService,
  IPayrollService,
  IShiftRotationsService,
  IShiftScheduleService,
  IShiftsService,
  ITimesheetsService,
} from './hr.service'

// Methods are bound arrow properties so they survive being passed as callbacks.
export class EmployeesApiClient implements IEmployeesService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: EmployeeListQuery): Promise<EmployeeDto[]> =>
    this.http.get<EmployeeDto[]>('/hr/employees', { params: q }).then((r) => r.data)
  get = (id: string): Promise<EmployeeDto> =>
    this.http.get<EmployeeDto>(`/hr/employees/${id}`).then((r) => r.data)
  create = (i: CreateEmployeeRequest): Promise<EmployeeDto> =>
    this.http.post<EmployeeDto>('/hr/employees', i).then((r) => r.data)
  update = (id: string, i: UpdateEmployeeRequest): Promise<EmployeeDto> =>
    this.http.patch<EmployeeDto>(`/hr/employees/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/employees/${id}`).then(() => undefined)
  leaveBalance = (id: string, year?: number): Promise<LeaveBalanceDto> =>
    this.http.get<LeaveBalanceDto>(`/hr/employees/${id}/leave-balance`, { params: { year } }).then((r) => r.data)
}

export class LeaveTypesApiClient implements ILeaveTypesService {
  constructor(private readonly http: AxiosInstance) {}
  list = (): Promise<LeaveTypeDto[]> => this.http.get<LeaveTypeDto[]>('/hr/leave-types').then((r) => r.data)
  create = (i: CreateLeaveTypeRequest): Promise<LeaveTypeDto> =>
    this.http.post<LeaveTypeDto>('/hr/leave-types', i).then((r) => r.data)
  update = (id: string, i: UpdateLeaveTypeRequest): Promise<LeaveTypeDto> =>
    this.http.patch<LeaveTypeDto>(`/hr/leave-types/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/leave-types/${id}`).then(() => undefined)
}

export class LeaveRequestsApiClient implements ILeaveRequestsService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: LeaveRequestListQuery): Promise<LeaveRequestDto[]> =>
    this.http.get<LeaveRequestDto[]>('/hr/leave-requests', { params: q }).then((r) => r.data)
  get = (id: string): Promise<LeaveRequestDto> =>
    this.http.get<LeaveRequestDto>(`/hr/leave-requests/${id}`).then((r) => r.data)
  create = (i: CreateLeaveRequestRequest): Promise<LeaveRequestDto> =>
    this.http.post<LeaveRequestDto>('/hr/leave-requests', i).then((r) => r.data)
  update = (id: string, i: UpdateLeaveRequestRequest): Promise<LeaveRequestDto> =>
    this.http.patch<LeaveRequestDto>(`/hr/leave-requests/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/leave-requests/${id}`).then(() => undefined)
  approve = (id: string): Promise<LeaveRequestDto> =>
    this.http.post<LeaveRequestDto>(`/hr/leave-requests/${id}/approve`, {}).then((r) => r.data)
  reject = (id: string): Promise<LeaveRequestDto> =>
    this.http.post<LeaveRequestDto>(`/hr/leave-requests/${id}/reject`, {}).then((r) => r.data)
}

export class TimesheetsApiClient implements ITimesheetsService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: TimesheetListQuery): Promise<TimesheetDto[]> =>
    this.http.get<TimesheetDto[]>('/hr/timesheets', { params: q }).then((r) => r.data)
  upsert = (i: UpsertTimesheetRequest): Promise<TimesheetDto> =>
    this.http.put<TimesheetDto>('/hr/timesheets', i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/timesheets/${id}`).then(() => undefined)
}

export class PayrollApiClient implements IPayrollService {
  constructor(private readonly http: AxiosInstance) {}
  listRuns = (q?: PayrollRunListQuery): Promise<PayrollRunDto[]> =>
    this.http.get<PayrollRunDto[]>('/hr/payroll/runs', { params: q }).then((r) => r.data)
  getRun = (id: string): Promise<PayrollRunDto> =>
    this.http.get<PayrollRunDto>(`/hr/payroll/runs/${id}`).then((r) => r.data)
  createRun = (i: CreatePayrollRunRequest): Promise<PayrollRunDto> =>
    this.http.post<PayrollRunDto>('/hr/payroll/runs', i).then((r) => r.data)
  removeRun = (id: string): Promise<void> => this.http.delete(`/hr/payroll/runs/${id}`).then(() => undefined)
  compute = (runId: string, i?: ComputePayrollRequest): Promise<PayrollRunDto> =>
    this.http.post<PayrollRunDto>(`/hr/payroll/runs/${runId}/compute`, i ?? {}).then((r) => r.data)
  finalize = (runId: string): Promise<PayrollRunDto> =>
    this.http.post<PayrollRunDto>(`/hr/payroll/runs/${runId}/finalize`, {}).then((r) => r.data)
  payslips = (runId: string): Promise<PayslipDto[]> =>
    this.http.get<PayslipDto[]>(`/hr/payroll/runs/${runId}/payslips`).then((r) => r.data)
  getPayslip = (payslipId: string): Promise<PayslipDto> =>
    this.http.get<PayslipDto>(`/hr/payroll/payslips/${payslipId}`).then((r) => r.data)
  pay = (payslipId: string, i: PayPayslipRequest): Promise<PayslipDto> =>
    this.http.post<PayslipDto>(`/hr/payroll/payslips/${payslipId}/pay`, i).then((r) => r.data)
  unpay = (payslipId: string): Promise<PayslipDto> =>
    this.http.post<PayslipDto>(`/hr/payroll/payslips/${payslipId}/unpay`, {}).then((r) => r.data)
}

export class PayrollParamsApiClient implements IPayrollParamsService {
  constructor(private readonly http: AxiosInstance) {}
  list = (): Promise<PayrollParamSetDto[]> =>
    this.http.get<PayrollParamSetDto[]>('/hr/payroll/params').then((r) => r.data)
  get = (year: number): Promise<PayrollParamSetDto> =>
    this.http.get<PayrollParamSetDto>(`/hr/payroll/params/${year}`).then((r) => r.data)
  upsert = (i: UpsertPayrollParamsRequest): Promise<PayrollParamSetDto> =>
    this.http.put<PayrollParamSetDto>('/hr/payroll/params', i).then((r) => r.data)
}

// ── PDKS clients ──────────────────────────────────────────────────────────────

export class ShiftsApiClient implements IShiftsService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: ShiftListQuery): Promise<ShiftDto[]> =>
    this.http.get<ShiftDto[]>('/hr/shifts', { params: q }).then((r) => r.data)
  get = (id: string): Promise<ShiftDto> =>
    this.http.get<ShiftDto>(`/hr/shifts/${id}`).then((r) => r.data)
  create = (i: CreateShiftRequest): Promise<ShiftDto> =>
    this.http.post<ShiftDto>('/hr/shifts', i).then((r) => r.data)
  update = (id: string, i: UpdateShiftRequest): Promise<ShiftDto> =>
    this.http.patch<ShiftDto>(`/hr/shifts/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/shifts/${id}`).then(() => undefined)
}

export class ShiftRotationsApiClient implements IShiftRotationsService {
  constructor(private readonly http: AxiosInstance) {}
  list = (): Promise<ShiftRotationDto[]> =>
    this.http.get<ShiftRotationDto[]>('/hr/shift-rotations').then((r) => r.data)
  get = (id: string): Promise<ShiftRotationDto> =>
    this.http.get<ShiftRotationDto>(`/hr/shift-rotations/${id}`).then((r) => r.data)
  create = (i: CreateShiftRotationRequest): Promise<ShiftRotationDto> =>
    this.http.post<ShiftRotationDto>('/hr/shift-rotations', i).then((r) => r.data)
  update = (id: string, i: UpdateShiftRotationRequest): Promise<ShiftRotationDto> =>
    this.http.patch<ShiftRotationDto>(`/hr/shift-rotations/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> =>
    this.http.delete(`/hr/shift-rotations/${id}`).then(() => undefined)
}

export class ShiftScheduleApiClient implements IShiftScheduleService {
  constructor(private readonly http: AxiosInstance) {}
  listAssignments = (q?: ShiftAssignmentListQuery): Promise<EmployeeShiftAssignmentDto[]> =>
    this.http.get<EmployeeShiftAssignmentDto[]>('/hr/shift-schedule/assignments', { params: q }).then((r) => r.data)
  assign = (i: AssignEmployeeShiftRequest): Promise<EmployeeShiftAssignmentDto> =>
    this.http.post<EmployeeShiftAssignmentDto>('/hr/shift-schedule/assignments', i).then((r) => r.data)
  updateAssignment = (id: string, i: UpdateEmployeeShiftRequest): Promise<EmployeeShiftAssignmentDto> =>
    this.http.patch<EmployeeShiftAssignmentDto>(`/hr/shift-schedule/assignments/${id}`, i).then((r) => r.data)
  removeAssignment = (id: string): Promise<void> =>
    this.http.delete(`/hr/shift-schedule/assignments/${id}`).then(() => undefined)
  generate = (i: GenerateScheduleRequest): Promise<GenerateScheduleResult> =>
    this.http.post<GenerateScheduleResult>('/hr/shift-schedule/generate', i).then((r) => r.data)
  listDays = (q?: ShiftDayListQuery): Promise<EmployeeShiftDayDto[]> =>
    this.http.get<EmployeeShiftDayDto[]>('/hr/shift-schedule/days', { params: q }).then((r) => r.data)
  setDay = (i: SetShiftDayRequest): Promise<EmployeeShiftDayDto> =>
    this.http.put<EmployeeShiftDayDto>('/hr/shift-schedule/days', i).then((r) => r.data)
  mine = (from?: string, to?: string): Promise<EmployeeShiftDayDto[]> =>
    this.http.get<EmployeeShiftDayDto[]>('/hr/shift-schedule/mine', { params: { from, to } }).then((r) => r.data)
}

export class CheckinAreasApiClient implements ICheckinAreasService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: CheckinAreaListQuery): Promise<CheckinAreaDto[]> =>
    this.http.get<CheckinAreaDto[]>('/hr/checkin-areas', { params: q }).then((r) => r.data)
  get = (id: string): Promise<CheckinAreaDto> =>
    this.http.get<CheckinAreaDto>(`/hr/checkin-areas/${id}`).then((r) => r.data)
  create = (i: CreateCheckinAreaRequest): Promise<CheckinAreaDto> =>
    this.http.post<CheckinAreaDto>('/hr/checkin-areas', i).then((r) => r.data)
  update = (id: string, i: UpdateCheckinAreaRequest): Promise<CheckinAreaDto> =>
    this.http.patch<CheckinAreaDto>(`/hr/checkin-areas/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> =>
    this.http.delete(`/hr/checkin-areas/${id}`).then(() => undefined)
  listEmployees = (id: string): Promise<string[]> =>
    this.http.get<string[]>(`/hr/checkin-areas/${id}/employees`).then((r) => r.data)
  setEmployees = (id: string, i: SetAreaEmployeesRequest): Promise<string[]> =>
    this.http.put<string[]>(`/hr/checkin-areas/${id}/employees`, i).then((r) => r.data)
}

export class AttendanceApiClient implements IAttendanceService {
  constructor(private readonly http: AxiosInstance) {}
  list = (q?: AttendanceListQuery): Promise<AttendanceRecordDto[]> =>
    this.http.get<AttendanceRecordDto[]>('/hr/attendance', { params: q }).then((r) => r.data)
  get = (id: string): Promise<AttendanceRecordDto> =>
    this.http.get<AttendanceRecordDto>(`/hr/attendance/${id}`).then((r) => r.data)
  checkin = (i: CheckinRequest): Promise<CheckinResultDto> =>
    this.http.post<CheckinResultDto>('/hr/attendance/checkin', i).then((r) => r.data)
  mine = (q?: AttendanceListQuery): Promise<AttendanceRecordDto[]> =>
    this.http.get<AttendanceRecordDto[]>('/hr/attendance/mine', { params: q }).then((r) => r.data)
  create = (i: CreateAttendanceRequest): Promise<AttendanceRecordDto> =>
    this.http.post<AttendanceRecordDto>('/hr/attendance', i).then((r) => r.data)
  update = (id: string, i: UpdateAttendanceRequest): Promise<AttendanceRecordDto> =>
    this.http.patch<AttendanceRecordDto>(`/hr/attendance/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`/hr/attendance/${id}`).then(() => undefined)
  import = (i: AttendanceImportRequest): Promise<AttendanceImportResultDto> =>
    this.http.post<AttendanceImportResultDto>('/hr/attendance/import', i).then((r) => r.data)
}

export class CardSourcesApiClient implements ICardSourcesService {
  constructor(private readonly http: AxiosInstance) {}
  list = (): Promise<CardSourceDto[]> =>
    this.http.get<CardSourceDto[]>('/hr/card-sources').then((r) => r.data)
  get = (id: string): Promise<CardSourceDto> =>
    this.http.get<CardSourceDto>(`/hr/card-sources/${id}`).then((r) => r.data)
  create = (i: CreateCardSourceRequest): Promise<CardSourceDto> =>
    this.http.post<CardSourceDto>('/hr/card-sources', i).then((r) => r.data)
  update = (id: string, i: UpdateCardSourceRequest): Promise<CardSourceDto> =>
    this.http.patch<CardSourceDto>(`/hr/card-sources/${id}`, i).then((r) => r.data)
  remove = (id: string): Promise<void> =>
    this.http.delete(`/hr/card-sources/${id}`).then(() => undefined)
  listCards = (q?: EmployeeCardListQuery): Promise<EmployeeCardDto[]> =>
    this.http.get<EmployeeCardDto[]>('/hr/employee-cards', { params: q }).then((r) => r.data)
  createCard = (i: CreateEmployeeCardRequest): Promise<EmployeeCardDto> =>
    this.http.post<EmployeeCardDto>('/hr/employee-cards', i).then((r) => r.data)
  updateCard = (id: string, i: UpdateEmployeeCardRequest): Promise<EmployeeCardDto> =>
    this.http.patch<EmployeeCardDto>(`/hr/employee-cards/${id}`, i).then((r) => r.data)
  removeCard = (id: string): Promise<void> =>
    this.http.delete(`/hr/employee-cards/${id}`).then(() => undefined)
}
