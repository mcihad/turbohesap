import { join } from 'node:path'

import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { type NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { assertProductionConfig, configuration } from './config/configuration'

// The compiled SPA lives in backend/static (the frontend builds into it). At
// runtime __dirname is backend/dist (prod) or backend/src (dev); ../static
// resolves to backend/static in both.
const STATIC_DIR = join(__dirname, '..', 'static')

async function bootstrap() {
  const cfg = configuration()
  // Fail fast on dangerous prod misconfig (default secrets).
  assertProductionConfig(cfg)

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Security headers. CSP is left off — it needs per-app tuning for the SPA's
  // inline theme bootstrap; enable + configure it when locking down for prod.
  app.use(helmet({ contentSecurityPolicy: false }))

  // CORS: explicit allowlist (CORS_ORIGINS) if set; otherwise open in dev only
  // (the SPA is served same-origin, so prod needs none unless external clients).
  if (cfg.corsOrigins.length > 0) {
    app.enableCors({ origin: cfg.corsOrigins, credentials: true })
  } else if (cfg.env !== 'production') {
    app.enableCors()
  }

  // The JSON API lives under /api → /api/<module>/<resource>.
  app.setGlobalPrefix('api')
  // Honour X-Forwarded-* so request base URL is correct behind a proxy.
  app.set('trust proxy', true)
  // Flush DB connections etc. on SIGTERM/SIGINT.
  app.enableShutdownHooks()
  // Validate + strip request bodies against the DTO class-validator decorators.
  // `forbidNonWhitelisted` rejects unknown fields instead of silently dropping.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  // OpenAPI docs at /api/docs (JSON at /api/docs-json). The @nestjs/swagger CLI
  // plugin (nest-cli.json) derives schemas from the DTOs automatically.
  const swaggerDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TurboHesap API')
      .setDescription('TurboHesap ERP — JSON API (/api/<module>/<resource>)')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  )
  SwaggerModule.setup('api/docs', app, swaggerDoc)

  // The global exception filter (normalize errors + capture 5xx) is registered
  // via APP_FILTER in AppModule so it can use DI (ErrorLogsService).

  // Serve the built frontend. Real files stream as-is; the HTML entrypoint is
  // always revalidated, hashed assets get a short max-age (rebuilt often).
  app.useStaticAssets(STATIC_DIR, {
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        res.setHeader('Cache-Control', `public, max-age=${cfg.staticCacheMaxAge}`)
      }
    },
  })

  // SPA fallback: unknown non-API GET/HEAD paths return index.html so client-side
  // routing (TanStack Router) keeps working on deep links / reload. Registered
  // after static + controllers, so it only runs when nothing else matched.
  const server = app.getHttpAdapter().getInstance()
  server.use((req: Request, res: Response, next: NextFunction) => {
    const isRead = req.method === 'GET' || req.method === 'HEAD'
    if (!isRead || req.path.startsWith('/api')) return next()
    res.sendFile(join(STATIC_DIR, 'index.html'), {
      cacheControl: false,
      headers: { 'Cache-Control': 'no-cache' },
    })
  })

  await app.listen(cfg.port, cfg.host)
  Logger.log(
    `TurboHesap API listening on ${cfg.host}:${cfg.port} (env: ${cfg.env})`,
    'Bootstrap',
  )
}

void bootstrap()
