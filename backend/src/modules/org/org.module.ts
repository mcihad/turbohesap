import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Branch } from './entities/branch.entity'
import { BranchesController } from './branches.controller'
import { BranchesService } from './branches.service'

// Organization module — branches (and future org definitions), served under
// /api/org/<resource>. Exports TypeOrmModule so the Branch repository is
// available where needed.
@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [TypeOrmModule],
})
export class OrgModule {}
