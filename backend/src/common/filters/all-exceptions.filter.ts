import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

import type { ApiError } from '@turbohesap/shared'

import { RequestContext } from '../context/request-context'
import { ErrorLogsService } from '../../modules/iam/errors/error-logs.service'

const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie'])

// Global exception filter: turns every thrown error into the shared `ApiError`
// shape, so clients always parse the same structure. Validation errors (whose
// message is a string[]) collapse to a single `message` + `details` array.
// Additionally, server errors (5xx) are persisted to the error log (deduped by
// fingerprint) via ErrorLogsService — req 2 (global error capture).
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(private readonly errorLogs: ErrorLogsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const res = http.getResponse<Response>()
    const req = http.getRequest<Request>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let error = 'Internal Server Error'
    let message = 'Beklenmeyen bir hata oluştu'
    let details: unknown

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (body && typeof body === 'object') {
        const o = body as { message?: unknown; error?: unknown }
        if (Array.isArray(o.message)) {
          message = String(o.message[0] ?? message)
          details = o.message
        } else if (typeof o.message === 'string') {
          message = o.message
        }
        if (typeof o.error === 'string') error = o.error
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(exception.stack ?? exception.message)
    }

    // Persist 5xx to the error log (fire-and-forget; never blocks the response).
    if (statusCode >= 500) {
      void this.errorLogs.capture(this.toCapture(exception, statusCode, req))
    }

    const payload: ApiError = { statusCode, error, message, details }
    res.status(statusCode).json(payload)
  }

  private toCapture(
    exception: unknown,
    statusCode: number,
    req: Request,
  ): Parameters<ErrorLogsService['capture']>[0] {
    const err = exception instanceof Error ? exception : undefined
    const stack = err?.stack ?? null
    const frame = this.firstFrame(stack)
    const ctx = RequestContext.get()
    const path = req?.path ?? null
    return {
      origin: 'server',
      message: err?.message ?? String(exception),
      exceptionType: err?.name ?? 'UnknownError',
      stackTrace: stack,
      fileName: frame?.file ?? null,
      lineNumber: frame?.line ?? null,
      httpMethod: req?.method ?? null,
      path,
      queryString: this.queryString(req),
      statusCode,
      ipAddress: req?.ip ?? null,
      userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
      headers: this.safeHeaders(req),
      userId: ctx?.userId ?? null,
      userName: ctx?.userName ?? null,
      module: this.moduleFromPath(path),
    }
  }

  private firstFrame(
    stack: string | null,
  ): { file: string; line: number } | null {
    if (!stack) return null
    const line = stack
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('at '))
    if (!line) return null
    const m = line.match(/\(?([^()\s]+):(\d+):(\d+)\)?$/)
    if (!m) return null
    return { file: m[1], line: Number(m[2]) }
  }

  private queryString(req: Request): string | null {
    const url = req?.originalUrl ?? req?.url ?? ''
    const i = url.indexOf('?')
    return i >= 0 ? url.slice(i + 1) : null
  }

  private safeHeaders(req: Request): Record<string, string> | null {
    if (!req?.headers) return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue
      out[k] = REDACTED_HEADERS.has(k.toLowerCase())
        ? '***'
        : Array.isArray(v)
          ? v.join(', ')
          : String(v)
    }
    return out
  }

  private moduleFromPath(path: string | null): string | null {
    if (!path) return null
    const segs = path.replace(/^\/+/, '').split('/').filter(Boolean)
    const first = segs[0] === 'api' ? segs[1] : segs[0]
    return first ?? null
  }
}
