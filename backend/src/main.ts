import { join } from 'node:path'

import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { type NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'

import { AppModule } from './app.module'
import { configuration } from './config/configuration'

// The compiled SPA lives in backend/static (the frontend builds into it). At
// runtime __dirname is backend/dist (prod) or backend/src (dev); ../static
// resolves to backend/static in both.
const STATIC_DIR = join(__dirname, '..', 'static')

async function bootstrap() {
  const cfg = configuration()
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors()
  // The JSON API lives under /api → /api/<module>/<resource>.
  app.setGlobalPrefix('api')
  // Honour X-Forwarded-* so request base URL is correct behind a proxy.
  app.set('trust proxy', true)
  // Validate + strip request bodies against the DTO class-validator decorators.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  )

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
