import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { KeycloakAuthGuard } from './common/keycloak-auth.guard'
import { configuration } from './config/configuration'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'
import { MeController } from './me/me.controller'
import { MetadataController } from './metadata/metadata.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Read .env from the backend dir and the repo root, so the whole monorepo
      // shares one configuration file (the repo-root .env wins is later in the
      // list; ConfigModule keeps the first occurrence, so backend/.env > root).
      envFilePath: ['.env', '../.env'],
      load: [configuration],
    }),
    DatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [MeController, MetadataController, HealthController],
  providers: [KeycloakAuthGuard],
})
export class AppModule {}
