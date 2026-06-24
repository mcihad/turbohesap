import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'

import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { configuration } from './config/configuration'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'
import { AuthModule } from './modules/auth/auth.module'
import { IamModule } from './modules/iam/iam.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [configuration],
    }),
    // JwtModule here makes JwtService available to the global JwtAuthGuard.
    JwtModule.register({}),
    DatabaseModule,
    IamModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guard chain (runs in this order):
    //   1) JwtAuthGuard      — authentication; routes opt out with @Public().
    //   2) PermissionsGuard  — authorization; enforces @RequirePermissions(...)
    //      on EVERY route automatically (no per-controller @UseGuards needed).
    //      Routes without @RequirePermissions just need a valid token.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
