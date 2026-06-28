import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { ContactPersonDto } from '@turbohesap/shared'

import { Contact } from './entities/contact.entity'
import { ContactPerson } from './entities/contact-person.entity'
import type {
  CreateContactPersonDto,
  UpdateContactPersonDto,
} from './dto/contact-person.dto'

@Injectable()
export class ContactPersonsService {
  constructor(
    @InjectRepository(ContactPerson) private readonly persons: Repository<ContactPerson>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async list(contactId: string): Promise<ContactPersonDto[]> {
    const rows = await this.persons.find({
      where: { contactId },
      order: { isPrimary: 'DESC', firstName: 'ASC' },
    })
    return rows.map(toContactPersonDto)
  }

  async get(id: string): Promise<ContactPersonDto> {
    const person = await this.findOrFail(id)
    return toContactPersonDto(person)
  }

  async create(dto: CreateContactPersonDto): Promise<ContactPersonDto> {
    const contact = await this.contacts.findOne({ where: { id: dto.contactId } })
    if (!contact) throw new NotFoundException('Cari bulunamadı')
    const person = this.persons.create({
      contactId: dto.contactId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName ?? '',
      title: dto.title ?? null,
      department: dto.department ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      mobile: dto.mobile ?? null,
      isPrimary: dto.isPrimary ?? false,
      notes: dto.notes ?? null,
    })
    const saved = await this.persons.save(person)
    return toContactPersonDto(saved)
  }

  async update(id: string, dto: UpdateContactPersonDto): Promise<ContactPersonDto> {
    const person = await this.findOrFail(id)
    Object.assign(person, dto)
    const saved = await this.persons.save(person)
    return toContactPersonDto(saved)
  }

  async remove(id: string): Promise<void> {
    const person = await this.findOrFail(id)
    await this.persons.remove(person)
  }

  private async findOrFail(id: string): Promise<ContactPerson> {
    const person = await this.persons.findOne({ where: { id } })
    if (!person) throw new NotFoundException('İlgili kişi bulunamadı')
    return person
  }
}

export function toContactPersonDto(p: ContactPerson): ContactPersonDto {
  return {
    id: p.id,
    contactId: p.contactId,
    firstName: p.firstName,
    lastName: p.lastName,
    title: p.title,
    department: p.department,
    email: p.email,
    phone: p.phone,
    mobile: p.mobile,
    isPrimary: p.isPrimary,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
