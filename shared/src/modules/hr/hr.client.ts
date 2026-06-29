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
import type {
  IEmployeesService,
  ILeaveRequestsService,
  ILeaveTypesService,
  IPayrollParamsService,
  IPayrollService,
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
