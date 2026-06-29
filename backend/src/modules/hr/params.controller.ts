import { Body, Controller, Get, Param, Put } from '@nestjs/common'

import { HrPermissions, type PayrollParamSetDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ParamsService } from './params.service'
import { UpsertPayrollParamsDto } from './dto/payroll.dto'

@Controller('hr/payroll/params')
export class ParamsController {
  constructor(private readonly params: ParamsService) {}

  @Get()
  @RequirePermissions(HrPermissions.read)
  list(): Promise<PayrollParamSetDto[]> {
    return this.params.list()
  }

  @Get(':year')
  @RequirePermissions(HrPermissions.read)
  get(@Param('year') year: string): Promise<PayrollParamSetDto> {
    return this.params.get(Number(year))
  }

  @Put()
  @RequirePermissions(HrPermissions.params)
  upsert(@Body() dto: UpsertPayrollParamsDto): Promise<PayrollParamSetDto> {
    return this.params.upsert(dto)
  }
}
