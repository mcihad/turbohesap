import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SalesChannel } from './entities/sales-channel.entity'
import { SalesChannelsController } from './sales-channels.controller'
import { SalesChannelsService } from './sales-channels.service'

// Sales module — sales channels (and future sales definitions), served under
// /api/sales/<resource>.
@Module({
  imports: [TypeOrmModule.forFeature([SalesChannel])],
  controllers: [SalesChannelsController],
  providers: [SalesChannelsService],
})
export class SalesModule {}
