import { Test, type TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { FinanceTransactionsService } from './finance-transactions.service'
import { FinanceTransaction } from './entities/finance-transaction.entity'
import type { CreateFinanceTransactionDto } from './dto/finance-transaction.dto'

describe('FinanceTransactionsService', () => {
  let service: FinanceTransactionsService
  let repo: jest.Mocked<Repository<FinanceTransaction>>

  beforeEach(async () => {
    const repoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceTransactionsService,
        {
          provide: getRepositoryToken(FinanceTransaction),
          useValue: repoMock,
        },
      ],
    }).compile()

    service = module.get<FinanceTransactionsService>(FinanceTransactionsService)
    repo = module.get(getRepositoryToken(FinanceTransaction))
  })

  describe('create', () => {
    it('should throw if neither cashAccountId nor bankAccountId is provided', async () => {
      const dto: CreateFinanceTransactionDto = {
        type: 'in',
        amount: 100,
        date: '2026-06-27T00:00:00Z',
      }

      await expect(service.create(dto)).rejects.toThrow(BadRequestException)
    })

    it('should throw if both cashAccountId and bankAccountId are provided', async () => {
      const dto: CreateFinanceTransactionDto = {
        cashAccountId: 'uuid-cash',
        bankAccountId: 'uuid-bank',
        type: 'in',
        amount: 100,
        date: '2026-06-27T00:00:00Z',
      }

      await expect(service.create(dto)).rejects.toThrow(BadRequestException)
    })

    it('should create and save a transaction', async () => {
      const dto: CreateFinanceTransactionDto = {
        cashAccountId: 'uuid-cash',
        type: 'in',
        amount: 100,
        date: '2026-06-27T00:00:00Z',
        description: 'Test',
      }

      const mockTx = {
        id: 'tx-uuid',
        cashAccountId: 'uuid-cash',
        bankAccountId: null,
        type: 'in',
        amount: 100,
        date: new Date('2026-06-27T00:00:00Z'),
        description: 'Test',
        createdAt: new Date('2026-06-27T00:00:00Z'),
        updatedAt: new Date('2026-06-27T00:00:00Z'),
      } as any

      repo.create.mockReturnValue(mockTx)
      repo.save.mockResolvedValue(mockTx)

      const result = await service.create(dto)
      expect(result.id).toBe('tx-uuid')
      expect(result.amount).toBe(100)
      expect(repo.create).toHaveBeenCalled()
      expect(repo.save).toHaveBeenCalled()
    })
  })

  describe('getSum', () => {
    it('should calculate sum correctly', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '150.00' }),
      } as any

      repo.createQueryBuilder.mockReturnValue(queryBuilderMock)

      const sum = await service.getSum('acc-uuid', 'cash')
      expect(sum).toBe(150)
      expect(queryBuilderMock.where).toHaveBeenCalledWith('t.cashAccountId = :accountId', { accountId: 'acc-uuid' })
    })

    it('should return 0 if no transactions', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      } as any

      repo.createQueryBuilder.mockReturnValue(queryBuilderMock)

      const sum = await service.getSum('acc-uuid', 'bank')
      expect(sum).toBe(0)
    })
  })
})
