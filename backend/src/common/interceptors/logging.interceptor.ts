import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { type Observable, tap } from 'rxjs'

import { RequestContext } from '../context/request-context'

// Logs one line per completed HTTP request: method, path, status, duration and
// the correlation id (X-Request-Id). Errors are logged by the exception filter.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const req = context.switchToHttp().getRequest<Request>()
    const res = context.switchToHttp().getResponse<Response>()
    const start = Date.now()
    const rid = RequestContext.get()?.requestId ?? '-'

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms rid=${rid}`,
        )
      }),
    )
  }
}
