import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CreateLeaveTypeRequest,
  LeaveTypeDto,
  UpdateLeaveTypeRequest,
} from '@turbohesap/shared'

import { LeaveType } from './entities/leave-type.entity'

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveType) private readonly leaveTypes: Repository<LeaveType>,
  ) {}

  async list(): Promise<LeaveTypeDto[]> {
    const rows = await this.leaveTypes.find({ order: { sortOrder: 'ASC', name: 'ASC' } })
    return rows.map(toLeaveTypeDto)
  }

  async create(input: CreateLeaveTypeRequest): Promise<LeaveTypeDto> {
    const leaveType = this.leaveTypes.create({
      name: input.name.trim(),
      paid: input.paid ?? true,
      affectsAnnualBalance: input.affectsAnnualBalance ?? false,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    })
    return toLeaveTypeDto(await this.leaveTypes.save(leaveType))
  }

  async update(id: string, input: UpdateLeaveTypeRequest): Promise<LeaveTypeDto> {
    const leaveType = await this.findOrFail(id)
    if (input.name !== undefined) leaveType.name = input.name.trim()
    if (input.paid !== undefined) leaveType.paid = input.paid
    if (input.affectsAnnualBalance !== undefined) leaveType.affectsAnnualBalance = input.affectsAnnualBalance
    if (input.isActive !== undefined) leaveType.isActive = input.isActive
    if (input.sortOrder !== undefined) leaveType.sortOrder = input.sortOrder
    return toLeaveTypeDto(await this.leaveTypes.save(leaveType))
  }

  async remove(id: string): Promise<void> {
    const leaveType = await this.findOrFail(id)
    await this.leaveTypes.remove(leaveType)
  }

  private async findOrFail(id: string): Promise<LeaveType> {
    const leaveType = await this.leaveTypes.findOne({ where: { id } })
    if (!leaveType) throw new NotFoundException('İzin türü bulunamadı')
    return leaveType
  }
}

export function toLeaveTypeDto(t: LeaveType): LeaveTypeDto {
  return {
    id: t.id,
    name: t.name,
    paid: t.paid,
    affectsAnnualBalance: t.affectsAnnualBalance,
    isActive: t.isActive,
    sortOrder: t.sortOrder,
  }
}
