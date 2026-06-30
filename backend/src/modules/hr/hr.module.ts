import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { IamModule } from '../iam/iam.module'
import { Role } from '../iam/entities/role.entity'
import { Employee } from './entities/employee.entity'
import { LeaveType } from './entities/leave-type.entity'
import { LeaveRequest } from './entities/leave-request.entity'
import { Timesheet } from './entities/timesheet.entity'
import { PayrollRun } from './entities/payroll-run.entity'
import { Payslip } from './entities/payslip.entity'
import { PayrollParamSet } from './entities/payroll-param-set.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { BankAccount } from '../finance/entities/bank-account.entity'
import { User } from '../iam/entities/user.entity'

import { EmployeesService } from './employees.service'
import { LeaveTypesService } from './leave-types.service'
import { LeaveRequestsService } from './leave-requests.service'
import { TimesheetsService } from './timesheets.service'
import { PayrollService } from './payroll.service'
import { ParamsService } from './params.service'

import { EmployeesController } from './employees.controller'
import { LeaveTypesController } from './leave-types.controller'
import { LeaveRequestsController } from './leave-requests.controller'
import { TimesheetsController } from './timesheets.controller'
import { ParamsController } from './params.controller'
import { PayrollController } from './payroll.controller'

// PDKS — vardiya, geofence giriş/çıkış, kartlı geçiş.
import { Shift } from './entities/shift.entity'
import { ShiftRotation } from './entities/shift-rotation.entity'
import { EmployeeShift } from './entities/employee-shift.entity'
import { EmployeeShiftDay } from './entities/employee-shift-day.entity'
import { CheckinArea } from './entities/checkin-area.entity'
import { EmployeeCheckinArea } from './entities/employee-checkin-area.entity'
import { AttendanceRecord } from './entities/attendance-record.entity'
import { CardSource } from './entities/card-source.entity'
import { EmployeeCard } from './entities/employee-card.entity'
import { ShiftsService } from './shifts.service'
import { ShiftRotationsService } from './shift-rotations.service'
import { ShiftScheduleService } from './shift-schedule.service'
import { CheckinAreasService } from './checkin-areas.service'
import { AttendanceService } from './attendance.service'
import { CardSourcesService } from './card-sources.service'
import { ShiftsController } from './shifts.controller'
import { ShiftRotationsController } from './shift-rotations.controller'
import { ShiftScheduleController } from './shift-schedule.controller'
import { CheckinAreasController } from './checkin-areas.controller'
import { AttendanceController } from './attendance.controller'
import { CardSourcesController, EmployeeCardsController } from './card-sources.controller'

// İK & Bordro — personel, izin, puantaj ve Türkiye bordro hesabı. The payroll
// math lives in the shared engine (bordro.helpers); this module persists the
// data and posts net-salary payments to finance (kasa/banka).
@Module({
  imports: [
    // For creating a login user when adding a personel (UsersService is exported
    // by IamModule); Role is borrowed to resolve the standard "personel" role.
    IamModule,
    TypeOrmModule.forFeature([
      Role,
      Employee,
      LeaveType,
      LeaveRequest,
      Timesheet,
      PayrollRun,
      Payslip,
      PayrollParamSet,
      FinanceTransaction,
      CashAccount,
      BankAccount,
      User,
      // PDKS entities
      Shift,
      ShiftRotation,
      EmployeeShift,
      EmployeeShiftDay,
      CheckinArea,
      EmployeeCheckinArea,
      AttendanceRecord,
      CardSource,
      EmployeeCard,
    ]),
  ],
  controllers: [
    EmployeesController,
    LeaveTypesController,
    LeaveRequestsController,
    TimesheetsController,
    ParamsController,
    PayrollController,
    ShiftsController,
    ShiftRotationsController,
    ShiftScheduleController,
    CheckinAreasController,
    AttendanceController,
    CardSourcesController,
    EmployeeCardsController,
  ],
  providers: [
    EmployeesService,
    LeaveTypesService,
    LeaveRequestsService,
    TimesheetsService,
    PayrollService,
    ParamsService,
    ShiftsService,
    ShiftRotationsService,
    ShiftScheduleService,
    CheckinAreasService,
    AttendanceService,
    CardSourcesService,
  ],
})
export class HrModule {}
