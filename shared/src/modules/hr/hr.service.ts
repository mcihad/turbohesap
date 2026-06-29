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
