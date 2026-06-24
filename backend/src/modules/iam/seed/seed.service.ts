import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'

import { configuration } from '../../../config/configuration'
import { PERMISSION_CATALOG } from '../../../permissions.catalog'
import { Permission } from '../entities/permission.entity'
import { Role } from '../entities/role.entity'
import { User } from '../entities/user.entity'
import { SYSTEM_ROLES } from '../iam.constants'

// Idempotent startup seeding: upserts the permission catalog, the system roles
// (admin, user), and a default admin user (from SEED_ADMIN_* in .env) when none
// exists. Safe to run on every boot.
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedPermissions()
    await this.seedRoles()
    await this.seedAdmin()
  }

  // Upserts the aggregated catalog: existing rows are refreshed, missing ones are
  // inserted. So any permission a module declares becomes available on boot.
  private async seedPermissions(): Promise<void> {
    let created = 0
    for (const def of PERMISSION_CATALOG) {
      const existing = await this.permissions.findOne({ where: { key: def.key } })
      if (existing) {
        existing.description = def.description
        existing.group = def.group
        await this.permissions.save(existing)
      } else {
        await this.permissions.save(this.permissions.create(def))
        created++
      }
    }
    if (created > 0) {
      this.logger.log(`${created} yeni izin veritabanına eklendi`)
    }
  }

  private async seedRoles(): Promise<void> {
    for (const def of Object.values(SYSTEM_ROLES)) {
      const perms = await this.permissions.find({
        where: { key: In([...def.permissions]) },
      })
      let role = await this.roles.findOne({ where: { name: def.name } })
      if (!role) {
        role = this.roles.create({ name: def.name, isSystem: true })
      }
      role.description = def.description
      role.module = def.module
      role.isSystem = true
      role.permissions = perms
      await this.roles.save(role)
    }
  }

  private async seedAdmin(): Promise<void> {
    const { adminUsername, adminPassword, adminEmail } = configuration().seed
    const existing = await this.users.findOne({
      where: { username: adminUsername },
    })
    if (existing) return

    const adminRole = await this.roles.findOne({
      where: { name: SYSTEM_ROLES.admin.name },
    })
    const user = this.users.create({
      username: adminUsername,
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      isActive: true,
      roles: adminRole ? [adminRole] : [],
    })
    await this.users.save(user)
    this.logger.warn(
      `"${adminUsername}" admin kullanıcısı oluşturuldu (production'da parolayı değiştirin)`,
    )
  }
}
