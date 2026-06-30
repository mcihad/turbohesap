import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import {
  HrPermissions,
  type CardSourceDto,
  type EmployeeCardDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateCardSourceDto,
  CreateEmployeeCardDto,
  UpdateCardSourceDto,
  UpdateEmployeeCardDto,
} from './dto/card.dto'
import { EmployeeCardListQueryDto } from './dto/hr-pdks-query.dto'
import { CardSourcesService } from './card-sources.service'

@Controller('hr/card-sources')
export class CardSourcesController {
  constructor(private readonly cardSources: CardSourcesService) {}

  @Get()
  @RequirePermissions(HrPermissions.cardsRead)
  list(): Promise<CardSourceDto[]> {
    return this.cardSources.list()
  }

  @Get(':id')
  @RequirePermissions(HrPermissions.cardsRead)
  get(@Param('id') id: string): Promise<CardSourceDto> {
    return this.cardSources.get(id)
  }

  @Post()
  @RequirePermissions(HrPermissions.cardsWrite)
  create(@Body() dto: CreateCardSourceDto): Promise<CardSourceDto> {
    return this.cardSources.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.cardsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCardSourceDto,
  ): Promise<CardSourceDto> {
    return this.cardSources.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.cardsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.cardSources.remove(id)
  }
}

// Employee↔card mapping (separate base path).
@Controller('hr/employee-cards')
export class EmployeeCardsController {
  constructor(private readonly cardSources: CardSourcesService) {}

  @Get()
  @RequirePermissions(HrPermissions.cardsRead)
  list(@Query() query: EmployeeCardListQueryDto): Promise<EmployeeCardDto[]> {
    return this.cardSources.listCards(query)
  }

  @Post()
  @RequirePermissions(HrPermissions.cardsWrite)
  create(@Body() dto: CreateEmployeeCardDto): Promise<EmployeeCardDto> {
    return this.cardSources.createCard(dto)
  }

  @Patch(':id')
  @RequirePermissions(HrPermissions.cardsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeCardDto,
  ): Promise<EmployeeCardDto> {
    return this.cardSources.updateCard(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(HrPermissions.cardsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.cardSources.removeCard(id)
  }
}
