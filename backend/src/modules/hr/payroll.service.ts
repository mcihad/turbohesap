import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  DEFAULT_PAYROLL_PARAMS_2026,
  computePayslip,
  type ComputePayrollRequest,
  type CreatePayrollRunRequest,
  type PayPayslipRequest,
  type PayrollParams,
  type PayrollRunDto,
  type PayrollRunListQuery,
  type PayslipDto,
} from '@turbohesap/shared'

import { PayrollRun } from './entities/payroll-run.entity'
import { Payslip } from './entities/payslip.entity'
import { Employee } from './entities/employee.entity'
import { Timesheet } from './entities/timesheet.entity'
import { PayrollParamSet } from './entities/payroll-param-set.entity'
import { payrollDaysOf } from './timesheets.service'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { BankAccount } from '../finance/entities/bank-account.entity'

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(Payslip) private readonly payslipsRepo: Repository<Payslip>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Timesheet) private readonly timesheets: Repository<Timesheet>,
    @InjectRepository(PayrollParamSet) private readonly paramSets: Repository<PayrollParamSet>,
    @InjectRepository(FinanceTransaction) private readonly finance: Repository<FinanceTransaction>,
    @InjectRepository(CashAccount) private readonly cashAccounts: Repository<CashAccount>,
    @InjectRepository(BankAccount) private readonly bankAccounts: Repository<BankAccount>,
  ) {}

  // ── Runs ───────────────────────────────────────────────────────────────────
  async listRuns(query?: PayrollRunListQuery): Promise<PayrollRunDto[]> {
    const qb = this.runs.createQueryBuilder('r')
    if (query?.year !== undefined) qb.andWhere('r.year = :year', { year: query.year })
    if (query?.status) qb.andWhere('r.status = :status', { status: query.status })
    if (query?.branchId) qb.andWhere('r.branchId = :branchId', { branchId: query.branchId })
    qb.orderBy('r.year', 'DESC').addOrderBy('r.month', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []
    const totals = await this.runTotals(rows.map((r) => r.id))
    return rows.map((r) => toRunDto(r, totals.get(r.id)))
  }

  async getRun(id: string): Promise<PayrollRunDto> {
    const run = await this.findRunOrFail(id)
    const totals = await this.runTotals([id])
    return toRunDto(run, totals.get(id))
  }

  async createRun(input: CreatePayrollRunRequest): Promise<PayrollRunDto> {
    const existing = await this.runs.findOne({ where: { year: input.year, month: input.month } })
    if (existing) throw new BadRequestException('Bu dönem için bordro zaten oluşturulmuş')
    const run = this.runs.create({
      year: input.year,
      month: input.month,
      status: 'draft',
      branchId: input.branchId ?? null,
      notes: input.notes ?? null,
    })
    return this.getRun((await this.runs.save(run)).id)
  }

  async removeRun(id: string): Promise<void> {
    const run = await this.findRunOrFail(id)
    if (run.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak bordro dönemi silinebilir')
    }
    await this.payslipsRepo.delete({ runId: id })
    await this.runs.remove(run)
  }

  /** (Re)compute payslips for a draft run from salaries + timesheets + params. */
  async compute(runId: string, input?: ComputePayrollRequest): Promise<PayrollRunDto> {
    const run = await this.findRunOrFail(runId)
    if (run.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak bordro dönemi hesaplanabilir')
    }
    const targetIds = input?.employeeIds?.filter(Boolean)
    const where: Record<string, unknown> = { isActive: true }
    if (run.branchId) where.branchId = run.branchId
    if (targetIds && targetIds.length > 0) where.id = In(targetIds)
    const employees = await this.employees.find({ where })

    const params = await this.paramsFor(run.year)

    // Recompute replaces existing draft payslips (scoped to the targeted employees
    // when a subset was requested, otherwise the whole run).
    if (targetIds && targetIds.length > 0) {
      await this.payslipsRepo.delete({ runId, employeeId: In(targetIds) })
    } else {
      await this.payslipsRepo.delete({ runId })
    }

    for (const emp of employees) {
      const timesheet = await this.timesheets.findOne({
        where: { employeeId: emp.id, year: run.year, month: run.month },
      })
      const days = timesheet ? payrollDaysOf(timesheet) : 30
      const kumulatifMatrahOnce = await this.cumulativeGvMatrah(emp.id, run.year, run.month)
      const breakdown = computePayslip({
        amount: emp.salaryAmount,
        salaryType: emp.salaryType,
        days,
        params,
        kumulatifMatrahOnce,
      })
      await this.payslipsRepo.save(
        this.payslipsRepo.create({
          runId,
          employeeId: emp.id,
          year: run.year,
          month: run.month,
          days: breakdown.days,
          brut: breakdown.brut,
          sgkMatrah: breakdown.sgkMatrah,
          sgkIsci: breakdown.sgkIsci,
          issizlikIsci: breakdown.issizlikIsci,
          gvMatrah: breakdown.gvMatrah,
          kumulatifMatrahOnce: breakdown.kumulatifMatrahOnce,
          gelirVergisi: breakdown.gelirVergisi,
          damga: breakdown.damga,
          gvIstisna: breakdown.gvIstisna,
          damgaIstisna: breakdown.damgaIstisna,
          net: breakdown.net,
          sgkIsveren: breakdown.sgkIsveren,
          issizlikIsveren: breakdown.issizlikIsveren,
          isverenMaliyet: breakdown.isverenMaliyet,
          financeTransactionId: null,
          paidAt: null,
        }),
      )
    }
    return this.getRun(runId)
  }

  async finalize(runId: string): Promise<PayrollRunDto> {
    const run = await this.findRunOrFail(runId)
    if (run.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak bordro dönemi kesinleştirilebilir')
    }
    const count = await this.payslipsRepo.count({ where: { runId } })
    if (count === 0) throw new BadRequestException('Kesinleştirmeden önce bordro hesaplanmalıdır')
    run.status = 'finalized'
    await this.runs.save(run)
    return this.getRun(runId)
  }

  // ── Payslips ─────────────────────────────────────────────────────────────
  async payslips(runId: string): Promise<PayslipDto[]> {
    await this.findRunOrFail(runId)
    const rows = await this.payslipsRepo.find({ where: { runId }, order: { createdAt: 'ASC' } })
    return this.toPayslipDtos(rows)
  }

  async getPayslip(payslipId: string): Promise<PayslipDto> {
    return (await this.toPayslipDtos([await this.findPayslipOrFail(payslipId)]))[0]
  }

  /** Post the net salary to finance (kasa/banka, type:'out'). */
  async pay(payslipId: string, input: PayPayslipRequest): Promise<PayslipDto> {
    const payslip = await this.findPayslipOrFail(payslipId)
    const run = await this.findRunOrFail(payslip.runId)
    if (run.status !== 'finalized' && run.status !== 'paid') {
      throw new BadRequestException('Maaş ödemesi için bordro kesinleşmiş olmalıdır')
    }
    if (payslip.financeTransactionId) {
      throw new BadRequestException('Bu bordro fişi zaten ödenmiş')
    }
    const cashId = input.cashAccountId ?? null
    const bankId = input.bankAccountId ?? null
    if ((cashId && bankId) || (!cashId && !bankId)) {
      throw new BadRequestException('Kasa veya banka hesabından yalnızca biri seçilmelidir')
    }
    if (cashId && !(await this.cashAccounts.findOne({ where: { id: cashId } }))) {
      throw new NotFoundException('Kasa bulunamadı')
    }
    if (bankId && !(await this.bankAccounts.findOne({ where: { id: bankId } }))) {
      throw new NotFoundException('Banka hesabı bulunamadı')
    }
    const employee = await this.employees.findOne({ where: { id: payslip.employeeId } })
    const empName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : 'Personel'
    const date = input.date ? new Date(input.date) : new Date()

    await this.runs.manager.transaction(async (em) => {
      const fin = await em.getRepository(FinanceTransaction).save(
        em.getRepository(FinanceTransaction).create({
          cashAccountId: cashId,
          bankAccountId: bankId,
          contactId: null,
          type: 'out',
          amount: payslip.net,
          date,
          description: `Maaş ödemesi — ${empName} ${payslip.month}/${payslip.year}`,
          sourceModule: 'bordro',
          sourceId: payslip.id,
        }),
      )
      const slip = await em.getRepository(Payslip).findOneOrFail({ where: { id: payslipId } })
      slip.financeTransactionId = fin.id
      slip.paidAt = date
      await em.getRepository(Payslip).save(slip)
      await this.refreshRunPaidStatus(em, payslip.runId)
    })
    return this.getPayslip(payslipId)
  }

  async unpay(payslipId: string): Promise<PayslipDto> {
    const payslip = await this.findPayslipOrFail(payslipId)
    if (!payslip.financeTransactionId) {
      throw new BadRequestException('Bu bordro fişi ödenmemiş')
    }
    await this.runs.manager.transaction(async (em) => {
      await em.getRepository(FinanceTransaction).delete({ id: payslip.financeTransactionId! })
      const slip = await em.getRepository(Payslip).findOneOrFail({ where: { id: payslipId } })
      slip.financeTransactionId = null
      slip.paidAt = null
      await em.getRepository(Payslip).save(slip)
      // A run drops back to 'finalized' as soon as one slip is unpaid.
      const run = await em.getRepository(PayrollRun).findOneOrFail({ where: { id: payslip.runId } })
      if (run.status === 'paid') {
        run.status = 'finalized'
        await em.getRepository(PayrollRun).save(run)
      }
    })
    return this.getPayslip(payslipId)
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async refreshRunPaidStatus(
    em: import('typeorm').EntityManager,
    runId: string,
  ): Promise<void> {
    const repo = em.getRepository(Payslip)
    const total = await repo.count({ where: { runId } })
    const unpaid = await repo
      .createQueryBuilder('p')
      .where('p.runId = :runId AND p.financeTransactionId IS NULL', { runId })
      .getCount()
    if (total > 0 && unpaid === 0) {
      const run = await em.getRepository(PayrollRun).findOneOrFail({ where: { id: runId } })
      if (run.status === 'finalized') {
        run.status = 'paid'
        await em.getRepository(PayrollRun).save(run)
      }
    }
  }

  /** Cumulative GV matrahı for an employee earlier in the same year. */
  private async cumulativeGvMatrah(employeeId: string, year: number, month: number): Promise<number> {
    const res = await this.payslipsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.gvMatrah), 0)', 'sum')
      .where('p.employeeId = :employeeId AND p.year = :year AND p.month < :month', {
        employeeId,
        year,
        month,
      })
      .getRawOne<{ sum: string }>()
    return res ? Number(res.sum) : 0
  }

  /** Param set for a year, falling back to the latest set, then the 2026 defaults. */
  private async paramsFor(year: number): Promise<PayrollParams> {
    const exact = await this.paramSets.findOne({ where: { year } })
    if (exact) return exact.params
    const latest = await this.paramSets.findOne({ where: {}, order: { year: 'DESC' } })
    return latest?.params ?? DEFAULT_PAYROLL_PARAMS_2026
  }

  private async runTotals(
    ids: string[],
  ): Promise<Map<string, { count: number; net: number; cost: number }>> {
    const map = new Map<string, { count: number; net: number; cost: number }>()
    if (ids.length === 0) return map
    const rows = await this.payslipsRepo
      .createQueryBuilder('p')
      .select('p.runId', 'rid')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.net), 0)', 'net')
      .addSelect('COALESCE(SUM(p.isverenMaliyet), 0)', 'cost')
      .where('p.runId IN (:...ids)', { ids })
      .groupBy('p.runId')
      .getRawMany<{ rid: string; count: string; net: string; cost: string }>()
    for (const r of rows) {
      map.set(r.rid, { count: Number(r.count), net: Number(r.net), cost: Number(r.cost) })
    }
    return map
  }

  private async toPayslipDtos(rows: Payslip[]): Promise<PayslipDto[]> {
    if (rows.length === 0) return []
    const empIds = [...new Set(rows.map((r) => r.employeeId))]
    const emps = await this.employees.find({ where: { id: In(empIds) } })
    const names = new Map(emps.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()]))
    return rows.map((p) => toPayslipDto(p, names.get(p.employeeId) ?? ''))
  }

  private async findRunOrFail(id: string): Promise<PayrollRun> {
    const run = await this.runs.findOne({ where: { id } })
    if (!run) throw new NotFoundException('Bordro dönemi bulunamadı')
    return run
  }

  private async findPayslipOrFail(id: string): Promise<Payslip> {
    const payslip = await this.payslipsRepo.findOne({ where: { id } })
    if (!payslip) throw new NotFoundException('Bordro fişi bulunamadı')
    return payslip
  }
}

function toRunDto(
  r: PayrollRun,
  totals?: { count: number; net: number; cost: number },
): PayrollRunDto {
  return {
    id: r.id,
    year: r.year,
    month: r.month,
    status: r.status,
    branchId: r.branchId,
    payslipCount: totals?.count ?? 0,
    totalNet: round2(totals?.net ?? 0),
    totalCost: round2(totals?.cost ?? 0),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toPayslipDto(p: Payslip, employeeName: string): PayslipDto {
  return {
    id: p.id,
    runId: p.runId,
    employeeId: p.employeeId,
    employeeName,
    year: p.year,
    month: p.month,
    brut: p.brut,
    days: p.days,
    sgkMatrah: p.sgkMatrah,
    sgkIsci: p.sgkIsci,
    issizlikIsci: p.issizlikIsci,
    gvMatrah: p.gvMatrah,
    kumulatifMatrahOnce: p.kumulatifMatrahOnce,
    gelirVergisi: p.gelirVergisi,
    damga: p.damga,
    gvIstisna: p.gvIstisna,
    damgaIstisna: p.damgaIstisna,
    net: p.net,
    sgkIsveren: p.sgkIsveren,
    issizlikIsveren: p.issizlikIsveren,
    isverenMaliyet: p.isverenMaliyet,
    financeTransactionId: p.financeTransactionId,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
