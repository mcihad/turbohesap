import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common'

import {
  HrPermissions,
  type PayrollRunDto,
  type PayrollRunListQuery,
  type PayrollRunStatus,
  type PayslipDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PayrollService } from './payroll.service'
import { ComputePayrollDto, CreatePayrollRunDto, PayPayslipDto } from './dto/payroll.dto'

@Controller('hr/payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // ── Runs ───────────────────────────────────────────────────────────────────
  @Get('runs')
  @RequirePermissions(HrPermissions.read)
  listRuns(
    @Query('year') year?: string,
    @Query('status') status?: PayrollRunStatus,
    @Query('branchId') branchId?: string,
  ): Promise<PayrollRunDto[]> {
    const query: PayrollRunListQuery = {
      year: year ? Number(year) : undefined,
      status,
      branchId,
    }
    return this.payroll.listRuns(query)
  }

  @Get('runs/:id')
  @RequirePermissions(HrPermissions.read)
  getRun(@Param('id') id: string): Promise<PayrollRunDto> {
    return this.payroll.getRun(id)
  }

  @Post('runs')
  @RequirePermissions(HrPermissions.payroll)
  createRun(@Body() dto: CreatePayrollRunDto): Promise<PayrollRunDto> {
    return this.payroll.createRun(dto)
  }

  @Delete('runs/:id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.payroll)
  async removeRun(@Param('id') id: string): Promise<void> {
    await this.payroll.removeRun(id)
  }

  @Post('runs/:id/compute')
  @RequirePermissions(HrPermissions.payroll)
  compute(@Param('id') id: string, @Body() dto: ComputePayrollDto): Promise<PayrollRunDto> {
    return this.payroll.compute(id, dto)
  }

  @Post('runs/:id/finalize')
  @RequirePermissions(HrPermissions.payroll)
  finalize(@Param('id') id: string): Promise<PayrollRunDto> {
    return this.payroll.finalize(id)
  }

  @Get('runs/:id/payslips')
  @RequirePermissions(HrPermissions.read)
  payslips(@Param('id') id: string): Promise<PayslipDto[]> {
    return this.payroll.payslips(id)
  }

  // ── Payslips ─────────────────────────────────────────────────────────────
  @Get('payslips/:id')
  @RequirePermissions(HrPermissions.read)
  getPayslip(@Param('id') id: string): Promise<PayslipDto> {
    return this.payroll.getPayslip(id)
  }

  @Post('payslips/:id/pay')
  @RequirePermissions(HrPermissions.pay)
  pay(@Param('id') id: string, @Body() dto: PayPayslipDto): Promise<PayslipDto> {
    return this.payroll.pay(id, dto)
  }

  @Post('payslips/:id/unpay')
  @RequirePermissions(HrPermissions.pay)
  unpay(@Param('id') id: string): Promise<PayslipDto> {
    return this.payroll.unpay(id)
  }
}
