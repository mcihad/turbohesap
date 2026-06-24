import { join } from 'node:path'

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { type NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'

import { AppModule } from './app.module'
import { configuration } from './config/configuration'
import { loadManifest } from './module/manifest'

// The compiled SPA lives in backend/static (the frontend builds into it). At
// runtime __dirname is backend/dist (prod) or backend/src (dev); ../static
// resolves to backend/static in both.
const STATIC_DIR = join(__dirname, '..', 'static')

async function bootstrap() {
  const cfg = configuration()
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors()
  // The JSON API lives under /api (handlers.go parity).
  app.setGlobalPrefix('api')
  // Honour X-Forwarded-* so request base URL is correct behind a proxy.
  app.set('trust proxy', true)

  // Serve the embedded frontend. Real files stream as-is; the HTML entrypoint is
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

  // SPA fallback: unknown non-API GET paths return index.html so client-side
  // routing (TanStack Router) keeps working on deep links / reload. Registered
  // after static + controllers, so it only runs when nothing else matched.
  const server = app.getHttpAdapter().getInstance()
  server.use((req: Request, res: Response, next: NextFunction) => {
    const isRead = req.method === 'GET' || req.method === 'HEAD'
    if (!isRead || req.path.startsWith('/api')) return next()
    // The SPA entrypoint is never cached so a new build is picked up immediately.
    res.sendFile(join(STATIC_DIR, 'index.html'), {
      cacheControl: false,
      headers: { 'Cache-Control': 'no-cache' },
    })
  })

  await app.listen(cfg.port, cfg.host)
  const mod = loadManifest()
  Logger.log(
    `${mod.displayName} listening on ${cfg.host}:${cfg.port} (env: ${cfg.env})`,
    'Bootstrap',
  )
  Logger.log(
    `module metadata at /api/${mod.api.version}/${mod.name}/metadata`,
    'Bootstrap',
  )
}

void bootstrap()
