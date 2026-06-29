import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

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

// İK & Bordro — personel, izin, puantaj ve Türkiye bordro hesabı. The payroll
// math lives in the shared engine (bordro.helpers); this module persists the
// data and posts net-salary payments to finance (kasa/banka).
@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [
    EmployeesController,
    LeaveTypesController,
    LeaveRequestsController,
    TimesheetsController,
    ParamsController,
    PayrollController,
  ],
  providers: [
    EmployeesService,
    LeaveTypesService,
    LeaveRequestsService,
    TimesheetsService,
    PayrollService,
    ParamsService,
  ],
})
export class HrModule {}
