import { randomUUID } from 'node:crypto'

import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { RequestContext, type RequestStore } from './request-context'

// Opens an AsyncLocalStorage scope for every request and seeds it with request
// metadata. Because it wraps next(), the whole downstream pipeline (guards,
// interceptors, the handler, and any DB work) runs inside the same scope.
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) || randomUUID()
    res.setHeader('X-Request-Id', requestId)
    const store: RequestStore = {
      requestId,
      userId: null,
      userName: null,
      ipAddress: req.ip ?? null,
      method: req.method ?? null,
      path: req.originalUrl ?? req.url ?? null,
    }
    RequestContext.run(store, () => next())
  }
}
