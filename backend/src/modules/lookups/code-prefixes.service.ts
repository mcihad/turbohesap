import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CodePrefixDto,
  ConsumeCodeResponse,
  PeekCodeResponse,
} from '@turbohesap/shared'

import { CodePrefix } from './entities/code-prefix.entity'
import type { CreateCodePrefixDto } from './dto/create-code-prefix.dto'
import type { UpdateCodePrefixDto } from './dto/update-code-prefix.dto'

function formatCode(prefix: string, n: number, padding: number): string {
  return `${prefix}${String(n).padStart(padding, '0')}`
}

function toCodePrefixDto(row: CodePrefix): CodePrefixDto {
  return {
    id: row.id,
    context: row.context,
    prefix: row.prefix,
    padding: row.padding,
    nextNumber: row.nextNumber,
    incrementOnSave: row.incrementOnSave,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    previewCode: formatCode(row.prefix, row.nextNumber, row.padding),
  }
}

@Injectable()
export class CodePrefixesService {
  constructor(
    @InjectRepository(CodePrefix) private readonly repo: Repository<CodePrefix>,
  ) {}

  async list(context?: string): Promise<CodePrefixDto[]> {
    const rows = await this.repo.find({
      where: context ? { context } : {},
      order: { context: 'ASC', sortOrder: 'ASC', prefix: 'ASC' },
    })
    return rows.map(toCodePrefixDto)
  }

  async get(id: string): Promise<CodePrefixDto> {
    return toCodePrefixDto(await this.findOrFail(id))
  }

  async create(dto: CreateCodePrefixDto): Promise<CodePrefixDto> {
    const context = dto.context.trim()
    const prefix = dto.prefix.trim()
    const clash = await this.repo.findOne({ where: { context, prefix } })
    if (clash) throw new BadRequestException('Bu bağlamda aynı önek zaten var')
    const row = this.repo.create({
      context,
      prefix,
      padding: dto.padding ?? 4,
      nextNumber: dto.nextNumber ?? 1,
      incrementOnSave: dto.incrementOnSave ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? (await this.nextSortOrder(context)),
    })
    return toCodePrefixDto(await this.repo.save(row))
  }

  async update(id: string, dto: UpdateCodePrefixDto): Promise<CodePrefixDto> {
    const row = await this.findOrFail(id)
    const nextContext = dto.context?.trim() ?? row.context
    const nextPrefix = dto.prefix?.trim() ?? row.prefix
    if (nextContext !== row.context || nextPrefix !== row.prefix) {
      const clash = await this.repo.findOne({ where: { context: nextContext, prefix: nextPrefix } })
      if (clash && clash.id !== id) throw new BadRequestException('Bu bağlamda aynı önek zaten var')
    }
    row.context = nextContext
    row.prefix = nextPrefix
    if (dto.padding !== undefined) row.padding = dto.padding
    if (dto.nextNumber !== undefined) row.nextNumber = dto.nextNumber
    if (dto.incrementOnSave !== undefined) row.incrementOnSave = dto.incrementOnSave
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder
    return toCodePrefixDto(await this.repo.save(row))
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(await this.findOrFail(id))
  }

  // Non-mutating — safe to call on every render/selection change.
  async peek(id: string): Promise<PeekCodeResponse> {
    const row = await this.findOrFail(id)
    return { code: formatCode(row.prefix, row.nextNumber, row.padding) }
  }

  // Atomic: a single UPDATE...RETURNING statement — Postgres's row lock for
  // the duration of that one statement is what makes concurrent consume()
  // calls race-free, unlike the count()+1 / MAX+1 patterns used elsewhere in
  // this codebase (invoices.service.ts issue(), production order numbers, …).
  async consume(id: string): Promise<ConsumeCodeResponse> {
    const row = await this.findOrFail(id)
    if (!row.isActive) throw new BadRequestException('Bu önek pasif, kod üretilemez')
    // TypeORM's Postgres driver returns [rows, affectedRowCount] for
    // non-SELECT queries (even with RETURNING) — not just the rows array.
    const [rows] = await this.repo.query(
      `UPDATE lookup_code_prefixes
          SET next_number = next_number + 1, updated_at = now()
        WHERE id = $1
        RETURNING next_number - 1 AS number, prefix, padding`,
      [id],
    )
    const issued = rows[0] as { number: number | string; prefix: string; padding: number }
    return { code: formatCode(issued.prefix, Number(issued.number), issued.padding) }
  }

  private async findOrFail(id: string): Promise<CodePrefix> {
    const row = await this.repo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Kod öneki bulunamadı')
    return row
  }

  private async nextSortOrder(context: string): Promise<number> {
    const last = await this.repo.findOne({ where: { context }, order: { sortOrder: 'DESC' } })
    return last ? last.sortOrder + 1 : 0
  }
}
