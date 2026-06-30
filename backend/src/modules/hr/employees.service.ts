import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CreateEmployeeRequest,
  EmployeeDto,
  EmployeeListQuery,
  LeaveBalanceDto,
  UpdateEmployeeRequest,
} from '@turbohesap/shared'

import { Role } from '../iam/entities/role.entity'
import { UsersService } from '../iam/users/users.service'
import { Employee } from './entities/employee.entity'
import { LeaveRequest } from './entities/leave-request.entity'
import { LeaveType } from './entities/leave-type.entity'

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(LeaveRequest) private readonly leaveRequests: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly leaveTypes: Repository<LeaveType>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly users: UsersService,
  ) {}

  async list(query?: EmployeeListQuery): Promise<EmployeeDto[]> {
    const qb = this.employees.createQueryBuilder('e')
    if (query?.departmentKey) qb.andWhere('e.departmentKey = :dep', { dep: query.departmentKey })
    if (query?.branchId) qb.andWhere('e.branchId = :branchId', { branchId: query.branchId })
    if (query?.isActive !== undefined) qb.andWhere('e.isActive = :act', { act: query.isActive })
    if (query?.search) {
      qb.andWhere(
        '(e.firstName ILIKE :q OR e.lastName ILIKE :q OR e.tcKimlikNo ILIKE :q OR e.email ILIKE :q)',
        { q: `%${query.search}%` },
      )
    }
    qb.orderBy('e.firstName', 'ASC').addOrderBy('e.lastName', 'ASC')
    return (await qb.getMany()).map(toEmployeeDto)
  }

  async get(id: string): Promise<EmployeeDto> {
    return toEmployeeDto(await this.findOrFail(id))
  }

  async create(input: CreateEmployeeRequest): Promise<EmployeeDto> {
    // Optional: create a login user on the spot (standard "Personel" role) when
    // the personel has no existing user linked. A provided userId wins.
    let userId = input.userId ?? null
    if (!userId && input.createUser) {
      userId = await this.createPersonelUser(input.createUser)
    }

    const employee = this.employees.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      tcKimlikNo: input.tcKimlikNo?.trim() ?? '',
      birthDate: input.birthDate ?? null,
      hireDate: input.hireDate,
      terminationDate: input.terminationDate ?? null,
      departmentKey: input.departmentKey ?? null,
      positionKey: input.positionKey ?? null,
      employmentType: input.employmentType ?? 'full_time',
      salaryType: input.salaryType ?? 'gross',
      salaryAmount: input.salaryAmount ?? 0,
      sgkSicilNo: input.sgkSicilNo ?? null,
      sgkStatus: input.sgkStatus ?? 'normal',
      iban: input.iban ?? null,
      bankName: input.bankName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      branchId: input.branchId ?? null,
      userId,
      cardNo: input.cardNo ?? null,
      annualLeaveDays: input.annualLeaveDays ?? 14,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    })
    return toEmployeeDto(await this.employees.save(employee))
  }

  async update(id: string, input: UpdateEmployeeRequest): Promise<EmployeeDto> {
    const employee = await this.findOrFail(id)
    if (input.firstName !== undefined) employee.firstName = input.firstName.trim()
    if (input.lastName !== undefined) employee.lastName = input.lastName.trim()
    if (input.tcKimlikNo !== undefined) employee.tcKimlikNo = input.tcKimlikNo?.trim() ?? ''
    if (input.birthDate !== undefined) employee.birthDate = input.birthDate
    if (input.hireDate !== undefined) employee.hireDate = input.hireDate
    if (input.terminationDate !== undefined) employee.terminationDate = input.terminationDate
    if (input.departmentKey !== undefined) employee.departmentKey = input.departmentKey
    if (input.positionKey !== undefined) employee.positionKey = input.positionKey
    if (input.employmentType !== undefined) employee.employmentType = input.employmentType
    if (input.salaryType !== undefined) employee.salaryType = input.salaryType
    if (input.salaryAmount !== undefined) employee.salaryAmount = input.salaryAmount
    if (input.sgkSicilNo !== undefined) employee.sgkSicilNo = input.sgkSicilNo
    if (input.sgkStatus !== undefined) employee.sgkStatus = input.sgkStatus
    if (input.iban !== undefined) employee.iban = input.iban
    if (input.bankName !== undefined) employee.bankName = input.bankName
    if (input.phone !== undefined) employee.phone = input.phone
    if (input.email !== undefined) employee.email = input.email
    if (input.address !== undefined) employee.address = input.address
    if (input.branchId !== undefined) employee.branchId = input.branchId
    if (input.userId !== undefined) employee.userId = input.userId
    // Create + link a login user on edit when the personel isn't linked yet.
    if (!employee.userId && input.createUser) {
      employee.userId = await this.createPersonelUser(input.createUser)
    }
    if (input.cardNo !== undefined) employee.cardNo = input.cardNo
    if (input.annualLeaveDays !== undefined) employee.annualLeaveDays = input.annualLeaveDays
    if (input.isActive !== undefined) employee.isActive = input.isActive
    if (input.notes !== undefined) employee.notes = input.notes
    return toEmployeeDto(await this.employees.save(employee))
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOrFail(id)
    await this.employees.remove(employee)
  }

  // Create a login user for a personel with the standard "Personel" role.
  private async createPersonelUser(input: {
    username: string
    email: string
    password: string
  }): Promise<string> {
    const role = await this.roles.findOne({ where: { name: 'personel' } })
    if (!role) {
      throw new BadRequestException(
        'Personel rolü bulunamadı (sunucu açılışında otomatik oluşturulur)',
      )
    }
    const user = await this.users.create({
      username: input.username.trim(),
      email: input.email.trim(),
      password: input.password,
      isActive: true,
      roleIds: [role.id],
    })
    return user.id
  }

  /** Annual paid-leave balance for a year (defaults to the current year). */
  async leaveBalance(id: string, year?: number): Promise<LeaveBalanceDto> {
    const employee = await this.findOrFail(id)
    const y = year ?? new Date().getFullYear()
    const yearStart = `${y}-01-01`
    const yearEnd = `${y}-12-31`

    // Leave types that deduct from the annual paid-leave balance.
    const annualTypeIds = (
      await this.leaveTypes.find({ where: { affectsAnnualBalance: true } })
    ).map((t) => t.id)

    let used = 0
    let pending = 0
    if (annualTypeIds.length > 0) {
      const rows = await this.leaveRequests
        .createQueryBuilder('r')
        .where('r.employeeId = :id', { id })
        .andWhere('r.leaveTypeId IN (:...types)', { types: annualTypeIds })
        .andWhere('r.status IN (:...statuses)', { statuses: ['approved', 'pending'] })
        // Request overlaps the requested calendar year.
        .andWhere('r.startDate <= :yearEnd AND r.endDate >= :yearStart', { yearStart, yearEnd })
        .getMany()
      for (const r of rows) {
        if (r.status === 'approved') used += Number(r.days)
        else pending += Number(r.days)
      }
    }

    const entitlement = employee.annualLeaveDays
    return {
      employeeId: id,
      year: y,
      entitlement,
      used,
      pending,
      remaining: Math.round((entitlement - used + Number.EPSILON) * 10) / 10,
    }
  }

  private async findOrFail(id: string): Promise<Employee> {
    const employee = await this.employees.findOne({ where: { id } })
    if (!employee) throw new NotFoundException('Personel bulunamadı')
    return employee
  }
}

export function toEmployeeDto(e: Employee): EmployeeDto {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: `${e.firstName} ${e.lastName}`.trim(),
    tcKimlikNo: e.tcKimlikNo,
    birthDate: e.birthDate,
    hireDate: e.hireDate,
    terminationDate: e.terminationDate,
    departmentKey: e.departmentKey,
    positionKey: e.positionKey,
    employmentType: e.employmentType,
    salaryType: e.salaryType,
    salaryAmount: e.salaryAmount,
    sgkSicilNo: e.sgkSicilNo,
    sgkStatus: e.sgkStatus,
    iban: e.iban,
    bankName: e.bankName,
    phone: e.phone,
    email: e.email,
    address: e.address,
    branchId: e.branchId,
    userId: e.userId,
    cardNo: e.cardNo,
    annualLeaveDays: e.annualLeaveDays,
    isActive: e.isActive,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }
}
