import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { RequestContextMiddleware } from './common/context/request-context.middleware'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { configuration } from './config/configuration'
import { DatabaseModule } from './database/database.module'
import { DebugController } from './modules/debug/debug.controller'
import { HealthController } from './health/health.controller'
import { AuthModule } from './modules/auth/auth.module'
import { IamModule } from './modules/iam/iam.module'
import { SalesModule } from './modules/sales/sales.module'
import { OrgModule } from './modules/org/org.module'
import { LookupsModule } from './modules/lookups/lookups.module'
import { InventoryModule } from './modules/inventory/inventory.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [configuration],
    }),
    // JwtModule here makes JwtService available to the global JwtAuthGuard.
    JwtModule.register({}),
    // Global rate limiting (in-memory store; use a shared store for multi-instance).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: configuration().throttle.ttl,
        limit: configuration().throttle.limit,
      },
    ]),
    DatabaseModule,
    IamModule,
    AuthModule,
    SalesModule,
    OrgModule,
    LookupsModule,
    InventoryModule,
  ],
  controllers: [HealthController, DebugController],
  providers: [
    // Global guard chain (runs in this order):
    //   0) ThrottlerGuard    — rate limiting (before auth, so it throttles even
    //      unauthenticated/abusive traffic). Tighter limits via @Throttle(...).
    //   1) JwtAuthGuard      — authentication; routes opt out with @Public().
    //   2) PermissionsGuard  — authorization; enforces @RequirePermissions(...)
    //      on EVERY route automatically (no per-controller @UseGuards needed).
    //      Routes without @RequirePermissions just need a valid token.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global exception filter (DI form, so it can persist 5xx via ErrorLogsService).
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Per-request HTTP log line (method/path/status/ms/request-id).
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  // Open an AsyncLocalStorage scope per request (user/ip/path) for the audit
  // subscriber and error filter.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*')
  }
}
