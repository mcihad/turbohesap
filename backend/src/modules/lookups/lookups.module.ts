import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { LookupItem } from './entities/lookup-item.entity'
import { CodePrefix } from './entities/code-prefix.entity'
import { LookupsController } from './lookups.controller'
import { LookupsService } from './lookups.service'
import { CodePrefixesController } from './code-prefixes.controller'
import { CodePrefixesService } from './code-prefixes.service'

// Lookups — generic key/value reference-data lists, served under /api/lookups.
// Also hosts code-prefixes: prefix+counter auto-numbering (/api/lookups/code-prefixes).
@Module({
  imports: [TypeOrmModule.forFeature([LookupItem, CodePrefix])],
  controllers: [LookupsController, CodePrefixesController],
  providers: [LookupsService, CodePrefixesService],
})
export class LookupsModule {}
