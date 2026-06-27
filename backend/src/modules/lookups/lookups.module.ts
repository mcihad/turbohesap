import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { LookupItem } from './entities/lookup-item.entity'
import { LookupsController } from './lookups.controller'
import { LookupsService } from './lookups.service'

// Lookups — generic key/value reference-data lists, served under /api/lookups.
@Module({
  imports: [TypeOrmModule.forFeature([LookupItem])],
  controllers: [LookupsController],
  providers: [LookupsService],
})
export class LookupsModule {}
