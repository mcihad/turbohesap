import {
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  DEFAULT_PAYROLL_PARAMS_2026,
  type PayrollParamSetDto,
  type UpsertPayrollParamsRequest,
} from '@turbohesap/shared'

import { PayrollParamSet } from './entities/payroll-param-set.entity'
import { LeaveType } from './entities/leave-type.entity'

// Fixed seed year — the default param set (and thus the engine's fallback) is for
// 2026 (see DEFAULT_PAYROLL_PARAMS_2026).
const SEED_YEAR = 2026

@Injectable()
export class ParamsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ParamsService.name)

  constructor(
    @InjectRepository(PayrollParamSet) private readonly paramSets: Repository<PayrollParamSet>,
    @InjectRepository(LeaveType) private readonly leaveTypes: Repository<LeaveType>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedParams()
    await this.seedLeaveTypes()
  }

  private async seedParams(): Promise<void> {
    if (await this.paramSets.findOne({ where: { year: SEED_YEAR } })) return
    await this.paramSets.save(
      this.paramSets.create({ year: SEED_YEAR, params: DEFAULT_PAYROLL_PARAMS_2026 }),
    )
    this.logger.log(`Varsayılan bordro parametreleri eklendi (${SEED_YEAR})`)
  }

  private async seedLeaveTypes(): Promise<void> {
    if ((await this.leaveTypes.count()) > 0) return
    const defaults: Array<{ name: string; paid: boolean; affectsAnnualBalance: boolean }> = [
      { name: 'Yıllık İzin', paid: true, affectsAnnualBalance: true },
      { name: 'Ücretsiz İzin', paid: false, affectsAnnualBalance: false },
      { name: 'Hastalık/Raporlu', paid: true, affectsAnnualBalance: false },
      { name: 'Mazeret', paid: true, affectsAnnualBalance: false },
    ]
    await this.leaveTypes.save(
      defaults.map((d, i) =>
        this.leaveTypes.create({
          name: d.name,
          paid: d.paid,
          affectsAnnualBalance: d.affectsAnnualBalance,
          isActive: true,
          sortOrder: i,
        }),
      ),
    )
    this.logger.log(`Varsayılan izin türleri eklendi (${defaults.length} öğe)`)
  }

  async list(): Promise<PayrollParamSetDto[]> {
    const rows = await this.paramSets.find({ order: { year: 'DESC' } })
    return rows.map(toParamSetDto)
  }

  async get(year: number): Promise<PayrollParamSetDto> {
    const row = await this.paramSets.findOne({ where: { year } })
    if (!row) throw new NotFoundException('Bordro parametre seti bulunamadı')
    return toParamSetDto(row)
  }

  async upsert(input: UpsertPayrollParamsRequest): Promise<PayrollParamSetDto> {
    let row = await this.paramSets.findOne({ where: { year: input.year } })
    if (!row) row = this.paramSets.create({ year: input.year, params: input.params })
    else row.params = input.params
    return toParamSetDto(await this.paramSets.save(row))
  }
}

export function toParamSetDto(p: PayrollParamSet): PayrollParamSetDto {
  return {
    id: p.id,
    year: p.year,
    params: p.params,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
