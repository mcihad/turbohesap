import { Controller, Get, Query } from '@nestjs/common'

import { ReportsPermissions, type ModuleStatsDto, type StatsQuery } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactsStatsService } from './contacts-stats.service'
import { FinanceStatsService } from './finance-stats.service'
import { InventoryStatsService } from './inventory-stats.service'
import { InvoicesStatsService } from './invoices-stats.service'
import { OverviewStatsService } from './overview-stats.service'
import { PosStatsService } from './pos-stats.service'
import { SalesStatsService } from './sales-stats.service'

// Per-module analytics. Every endpoint returns the same generic ModuleStatsDto
// (cached server-side) and is gated by its own reports.<module> permission.
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly overview: OverviewStatsService,
    private readonly pos: PosStatsService,
    private readonly inventory: InventoryStatsService,
    private readonly finance: FinanceStatsService,
    private readonly invoices: InvoicesStatsService,
    private readonly contacts: ContactsStatsService,
    private readonly sales: SalesStatsService,
  ) {}

  @Get('overview')
  @RequirePermissions(ReportsPermissions.overview)
  getOverview(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.overview.stats(query)
  }

  @Get('pos')
  @RequirePermissions(ReportsPermissions.pos)
  getPos(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.pos.stats(query)
  }

  @Get('inventory')
  @RequirePermissions(ReportsPermissions.inventory)
  getInventory(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.inventory.stats(query)
  }

  @Get('finance')
  @RequirePermissions(ReportsPermissions.finance)
  getFinance(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.finance.stats(query)
  }

  @Get('invoices')
  @RequirePermissions(ReportsPermissions.invoices)
  getInvoices(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.invoices.stats(query)
  }

  @Get('contacts')
  @RequirePermissions(ReportsPermissions.contacts)
  getContacts(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.contacts.stats(query)
  }

  @Get('sales')
  @RequirePermissions(ReportsPermissions.sales)
  getSales(@Query() query: StatsQuery): Promise<ModuleStatsDto> {
    return this.sales.stats(query)
  }
}
