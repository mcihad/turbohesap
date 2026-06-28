import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { ContactAddressDto } from '@turbohesap/shared'

import { Contact } from './entities/contact.entity'
import { ContactAddress } from './entities/contact-address.entity'
import type {
  CreateContactAddressDto,
  UpdateContactAddressDto,
} from './dto/contact-address.dto'

@Injectable()
export class ContactAddressesService {
  constructor(
    @InjectRepository(ContactAddress) private readonly addresses: Repository<ContactAddress>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async list(contactId: string): Promise<ContactAddressDto[]> {
    const rows = await this.addresses.find({
      where: { contactId },
      order: { createdAt: 'ASC' },
    })
    return rows.map(toContactAddressDto)
  }

  async get(id: string): Promise<ContactAddressDto> {
    const address = await this.findOrFail(id)
    return toContactAddressDto(address)
  }

  async create(dto: CreateContactAddressDto): Promise<ContactAddressDto> {
    const contact = await this.contacts.findOne({ where: { id: dto.contactId } })
    if (!contact) throw new NotFoundException('Cari bulunamadı')

    const address = this.addresses.create({
      contactId: dto.contactId,
      addressType: dto.addressType,
      title: dto.title ?? null,
      line1: dto.line1,
      line2: dto.line2 ?? null,
      district: dto.district ?? null,
      city: dto.city,
      postalCode: dto.postalCode ?? null,
      country: dto.country ?? 'Türkiye',
      phone: dto.phone ?? null,
      isPrimaryBilling: dto.isPrimaryBilling ?? false,
      isPrimaryShipping: dto.isPrimaryShipping ?? false,
    })
    const saved = await this.addresses.save(address)
    return toContactAddressDto(saved)
  }

  async update(id: string, dto: UpdateContactAddressDto): Promise<ContactAddressDto> {
    const address = await this.findOrFail(id)
    Object.assign(address, dto)
    const saved = await this.addresses.save(address)
    return toContactAddressDto(saved)
  }

  async remove(id: string): Promise<void> {
    const address = await this.findOrFail(id)
    await this.addresses.remove(address)
  }

  private async findOrFail(id: string): Promise<ContactAddress> {
    const address = await this.addresses.findOne({ where: { id } })
    if (!address) throw new NotFoundException('Adres bulunamadı')
    return address
  }
}

export function toContactAddressDto(a: ContactAddress): ContactAddressDto {
  return {
    id: a.id,
    contactId: a.contactId,
    addressType: a.addressType,
    title: a.title,
    line1: a.line1,
    line2: a.line2,
    district: a.district,
    city: a.city,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone,
    isPrimaryBilling: a.isPrimaryBilling,
    isPrimaryShipping: a.isPrimaryShipping,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
