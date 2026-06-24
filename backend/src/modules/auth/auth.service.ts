import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'

import type { AuthTokens, CurrentUser, LoginResponse } from '@turbohesap/shared'

import { AccessService } from '../iam/access.service'
import { User } from '../iam/entities/user.entity'
import { toCurrentUser } from '../iam/mappers'
import { RefreshToken } from './entities/refresh-token.entity'
import { TokenService } from './token.service'

// AuthService runs local username/password login and JWT issuance, with
// persisted, rotating refresh tokens.
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly tokens: TokenService,
    private readonly access: AccessService,
  ) {}

  async login(username: string, password: string): Promise<LoginResponse> {
    const user = await this.validate(username, password)
    user.lastLoginAt = new Date()
    await this.users.save(user)
    const tokens = await this.issueTokens(user)
    return { ...tokens, user: toCurrentUser(user) }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let jti: string
    let sub: string
    try {
      const payload = await this.tokens.verifyRefreshToken(refreshToken)
      jti = payload.jti
      sub = payload.sub
    } catch {
      throw new UnauthorizedException('invalid refresh token')
    }

    const row = await this.refreshTokens.findOne({ where: { id: jti } })
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('refresh token expired or revoked')
    }

    const user = await this.users.findOne({ where: { id: sub } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('user not found or inactive')
    }

    // Rotate: revoke the presented token and issue a fresh pair.
    const next = await this.issueTokens(user)
    row.revokedAt = new Date()
    await this.refreshTokens.save(row)
    return next
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const { jti } = await this.tokens.verifyRefreshToken(refreshToken)
      const row = await this.refreshTokens.findOne({ where: { id: jti } })
      if (row && !row.revokedAt) {
        row.revokedAt = new Date()
        await this.refreshTokens.save(row)
      }
    } catch {
      // Best effort — let the client clear local state regardless.
    }
  }

  async me(userId: string): Promise<CurrentUser> {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('user not found')
    return toCurrentUser(user)
  }

  /** The caller's effective permission keys (resolved from roles in the DB). */
  permissions(userId: string): Promise<string[]> {
    return this.access.permissionKeys(userId)
  }

  /** Verify credentials; throws 401 on any failure. */
  private async validate(username: string, password: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.username = :username', { username })
      .getOne()

    if (!user || !user.isActive) {
      throw new UnauthorizedException('invalid credentials')
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials')
    }
    return user
  }

  /** Sign an access token and persist + sign a rotating refresh token. */
  private async issueTokens(user: User): Promise<AuthTokens> {
    const row = this.refreshTokens.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + this.tokens.refreshTtlSeconds() * 1000),
    })
    await this.refreshTokens.save(row)

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      username: user.username,
      roles: (user.roles ?? []).map((r) => r.name),
    })
    const refreshToken = await this.tokens.signRefreshToken({
      sub: user.id,
      jti: row.id,
    })

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.tokens.accessTtlSeconds(),
      refreshTokenExpiresIn: this.tokens.refreshTtlSeconds(),
    }
  }
}
