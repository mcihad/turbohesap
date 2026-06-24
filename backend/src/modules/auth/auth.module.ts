import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../iam/entities/user.entity'
import { IamModule } from '../iam/iam.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RefreshToken } from './entities/refresh-token.entity'
import { TokenService } from './token.service'

// AuthModule wires local login + JWT issuance. JwtModule is registered without a
// global secret — TokenService passes the access/refresh secrets per call.
// IamModule provides AccessService (effective-permission resolution).
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.register({}),
    IamModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
