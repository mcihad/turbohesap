import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import {
  HrPermissions,
  type EmployeeDto,
  type EmployeeListQuery,
  type LeaveBalanceDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { EmployeesService } from './employees.service'
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto'

@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions(HrPermissions.read)
  list(
    @Query('search') search?: string,
    @Query('departmentKey') departmentKey?: string,
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<EmployeeDto[]> {
    const query: EmployeeListQuery = {
      search,
      departmentKey,
      branchId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    }
    return this.employees.list(query)
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.read)
  get(@Param('id') id: string): Promise<EmployeeDto> {
    return this.employees.get(id)
  }

  @Get(':id/leave-balance')
  @RequirePermissions(HrPermissions.read)
  leaveBalance(
    @Param('id') id: string,
    @Query('year') year?: string,
  ): Promise<LeaveBalanceDto> {
    return this.employees.leaveBalance(id, year ? Number(year) : undefined)
  }

  @Post()
  @RequirePermissions(HrPermissions.write)
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeDto> {
    return this.employees.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    return this.employees.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.employees.remove(id)
  }
}
