import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { TimesheetDto, TimesheetListQuery, UpsertTimesheetRequest } from '@turbohesap/shared'

import { Timesheet } from './entities/timesheet.entity'
import { Employee } from './entities/employee.entity'

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(Timesheet) private readonly timesheets: Repository<Timesheet>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  async list(query?: TimesheetListQuery): Promise<TimesheetDto[]> {
    const qb = this.timesheets.createQueryBuilder('t')
    if (query?.year !== undefined) qb.andWhere('t.year = :year', { year: query.year })
    if (query?.month !== undefined) qb.andWhere('t.month = :month', { month: query.month })
    if (query?.employeeId) qb.andWhere('t.employeeId = :emp', { emp: query.employeeId })
    qb.orderBy('t.year', 'DESC').addOrderBy('t.month', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []
    const empIds = [...new Set(rows.map((r) => r.employeeId))]
    const emps = await this.employees.find({ where: { id: In(empIds) } })
    const names = new Map(emps.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()]))
    return rows.map((r) => toTimesheetDto(r, names.get(r.employeeId) ?? ''))
  }

  async upsert(input: UpsertTimesheetRequest): Promise<TimesheetDto> {
    const employee = await this.employees.findOne({ where: { id: input.employeeId } })
    if (!employee) throw new NotFoundException('Personel bulunamadı')
    let row = await this.timesheets.findOne({
      where: { employeeId: input.employeeId, year: input.year, month: input.month },
    })
    if (!row) {
      row = this.timesheets.create({
        employeeId: input.employeeId,
        year: input.year,
        month: input.month,
        workedDays: input.workedDays ?? 0,
        weekendDays: input.weekendDays ?? 0,
        holidayDays: input.holidayDays ?? 0,
        overtimeHours: input.overtimeHours ?? 0,
        absentDays: input.absentDays ?? 0,
        paidLeaveDays: input.paidLeaveDays ?? 0,
        unpaidLeaveDays: input.unpaidLeaveDays ?? 0,
        notes: input.notes ?? null,
      })
    } else {
      row.workedDays = input.workedDays ?? 0
      row.weekendDays = input.weekendDays ?? 0
      row.holidayDays = input.holidayDays ?? 0
      row.overtimeHours = input.overtimeHours ?? 0
      row.absentDays = input.absentDays ?? 0
      row.paidLeaveDays = input.paidLeaveDays ?? 0
      row.unpaidLeaveDays = input.unpaidLeaveDays ?? 0
      row.notes = input.notes ?? null
    }
    const saved = await this.timesheets.save(row)
    return toTimesheetDto(saved, `${employee.firstName} ${employee.lastName}`.trim())
  }

  async remove(id: string): Promise<void> {
    const row = await this.timesheets.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Puantaj kaydı bulunamadı')
    await this.timesheets.remove(row)
  }
}

/** Payroll day basis: workedDays + paidLeaveDays, capped at 30. */
export function payrollDaysOf(t: Pick<Timesheet, 'workedDays' | 'paidLeaveDays'>): number {
  return Math.min(30, Number(t.workedDays) + Number(t.paidLeaveDays))
}

export function toTimesheetDto(t: Timesheet, employeeName: string): TimesheetDto {
  return {
    id: t.id,
    employeeId: t.employeeId,
    employeeName,
    year: t.year,
    month: t.month,
    workedDays: t.workedDays,
    weekendDays: t.weekendDays,
    holidayDays: t.holidayDays,
    overtimeHours: t.overtimeHours,
    absentDays: t.absentDays,
    paidLeaveDays: t.paidLeaveDays,
    unpaidLeaveDays: t.unpaidLeaveDays,
    payrollDays: payrollDaysOf(t),
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
