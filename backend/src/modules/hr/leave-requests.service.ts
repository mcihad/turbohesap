import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  CreateLeaveRequestRequest,
  LeaveRequestDto,
  LeaveRequestListQuery,
  UpdateLeaveRequestRequest,
} from '@turbohesap/shared'

import { LeaveRequest } from './entities/leave-request.entity'
import { LeaveType } from './entities/leave-type.entity'
import { Employee } from './entities/employee.entity'
import { User } from '../iam/entities/user.entity'
import { displayName } from '../contacts/user-name.util'

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequest) private readonly requests: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly leaveTypes: Repository<LeaveType>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(query?: LeaveRequestListQuery): Promise<LeaveRequestDto[]> {
    const qb = this.requests.createQueryBuilder('r')
    if (query?.employeeId) qb.andWhere('r.employeeId = :emp', { emp: query.employeeId })
    if (query?.status) qb.andWhere('r.status = :status', { status: query.status })
    if (query?.from) qb.andWhere('r.endDate >= :from', { from: query.from })
    if (query?.to) qb.andWhere('r.startDate <= :to', { to: query.to })
    qb.orderBy('r.startDate', 'DESC').addOrderBy('r.createdAt', 'DESC')
    return this.toDtos(await qb.getMany())
  }

  async get(id: string): Promise<LeaveRequestDto> {
    return (await this.toDtos([await this.findOrFail(id)]))[0]
  }

  async create(input: CreateLeaveRequestRequest): Promise<LeaveRequestDto> {
    if (!(await this.employees.findOne({ where: { id: input.employeeId } }))) {
      throw new NotFoundException('Personel bulunamadı')
    }
    if (!(await this.leaveTypes.findOne({ where: { id: input.leaveTypeId } }))) {
      throw new NotFoundException('İzin türü bulunamadı')
    }
    const request = this.requests.create({
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      days: input.days ?? inclusiveDays(input.startDate, input.endDate),
      reason: input.reason ?? null,
      status: 'pending',
      approvedById: null,
    })
    return this.get((await this.requests.save(request)).id)
  }

  async update(id: string, input: UpdateLeaveRequestRequest): Promise<LeaveRequestDto> {
    const request = await this.findOrFail(id)
    if (request.status !== 'pending') {
      throw new BadRequestException('Yalnızca onay bekleyen izin talepleri düzenlenebilir')
    }
    if (input.leaveTypeId !== undefined) {
      if (!(await this.leaveTypes.findOne({ where: { id: input.leaveTypeId } }))) {
        throw new NotFoundException('İzin türü bulunamadı')
      }
      request.leaveTypeId = input.leaveTypeId
    }
    if (input.startDate !== undefined) request.startDate = input.startDate
    if (input.endDate !== undefined) request.endDate = input.endDate
    if (input.days !== undefined) request.days = input.days
    else if (input.startDate !== undefined || input.endDate !== undefined) {
      request.days = inclusiveDays(request.startDate, request.endDate)
    }
    if (input.reason !== undefined) request.reason = input.reason
    await this.requests.save(request)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const request = await this.findOrFail(id)
    await this.requests.remove(request)
  }

  async approve(id: string, approverId: string): Promise<LeaveRequestDto> {
    return this.setStatus(id, 'approved', approverId)
  }

  async reject(id: string, approverId: string): Promise<LeaveRequestDto> {
    return this.setStatus(id, 'rejected', approverId)
  }

  private async setStatus(
    id: string,
    status: 'approved' | 'rejected',
    approverId: string,
  ): Promise<LeaveRequestDto> {
    const request = await this.findOrFail(id)
    request.status = status
    request.approvedById = approverId
    await this.requests.save(request)
    return this.get(id)
  }

  private async findOrFail(id: string): Promise<LeaveRequest> {
    const request = await this.requests.findOne({ where: { id } })
    if (!request) throw new NotFoundException('İzin talebi bulunamadı')
    return request
  }

  private async toDtos(rows: LeaveRequest[]): Promise<LeaveRequestDto[]> {
    if (rows.length === 0) return []
    const empIds = [...new Set(rows.map((r) => r.employeeId))]
    const typeIds = [...new Set(rows.map((r) => r.leaveTypeId))]
    const approverIds = [...new Set(rows.map((r) => r.approvedById).filter((x): x is string => !!x))]
    const [emps, types, approvers] = await Promise.all([
      this.employees.find({ where: { id: In(empIds) } }),
      this.leaveTypes.find({ where: { id: In(typeIds) } }),
      approverIds.length ? this.users.find({ where: { id: In(approverIds) } }) : Promise.resolve([]),
    ])
    const empNames = new Map(emps.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()]))
    const typeNames = new Map(types.map((t) => [t.id, t.name]))
    const approverNames = new Map(approvers.map((u) => [u.id, displayName(u)]))
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empNames.get(r.employeeId) ?? '',
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: typeNames.get(r.leaveTypeId) ?? '',
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      reason: r.reason,
      status: r.status,
      approvedById: r.approvedById,
      approvedByName: r.approvedById ? approverNames.get(r.approvedById) ?? null : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }
}

/** Inclusive day count between two ISO date strings (yyyy-mm-dd). */
function inclusiveDays(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`).getTime()
  const e = new Date(`${end}T00:00:00Z`).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
  return Math.floor((e - s) / 86_400_000) + 1
}
