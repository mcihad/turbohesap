import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'

import {
  InventoryPermissions,
  type AvailabilityDto,
  type ProductCostDto,
  type StockReservationDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ReservationsService } from './reservations.service'
import { CostService } from './cost.service'
import { AvailabilityService } from './availability.service'
import {
  AvailabilityBulkDto,
  AvailabilityQueryDto,
  ProductCostQueryDto,
  ReleaseReservationDto,
  ReservationListQueryDto,
  ReserveStockDto,
} from './dto/stock-ops.dto'

@Controller('inventory/reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  list(@Query() query: ReservationListQueryDto): Promise<StockReservationDto[]> {
    return this.reservations.list(query)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.productsStock)
  reserve(@Body() dto: ReserveStockDto): Promise<StockReservationDto> {
    return this.reservations.reserve(dto)
  }

  @Post('release')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsStock)
  async release(@Body() dto: ReleaseReservationDto): Promise<void> {
    await this.reservations.releaseSource(dto.sourceModule, dto.sourceId)
  }
}

@Controller('inventory/cost')
export class ProductCostController {
  constructor(private readonly cost: CostService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  get(@Query() query: ProductCostQueryDto): Promise<ProductCostDto> {
    return this.cost.get(query.productId, query.variantId ?? null, query.branchId ?? null)
  }
}

@Controller('inventory/availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  get(@Query() query: AvailabilityQueryDto): Promise<AvailabilityDto> {
    return this.availability.get({
      productId: query.productId,
      variantId: query.variantId ?? null,
      branchId: query.branchId ?? null,
      horizonDays: query.horizonDays,
    })
  }

  @Post('bulk')
  @RequirePermissions(InventoryPermissions.productsRead)
  bulk(@Body() dto: AvailabilityBulkDto): Promise<AvailabilityDto[]> {
    return this.availability.bulk(dto.units, { branchId: dto.branchId, horizonDays: dto.horizonDays })
  }
}
