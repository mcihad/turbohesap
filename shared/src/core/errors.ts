import axios from 'axios'

// The single, normalized error shape every API endpoint returns (produced by the
// backend's global exception filter) and every client reads. Keeps error handling
// consistent across web and mobile.
export interface ApiError {
  statusCode: number
  /** Short error name, e.g. "Forbidden", "Bad Request". */
  error: string
  /** Human-readable message (single line; the first validation message if many). */
  message: string
  /** Extra detail when present, e.g. the full list of validation messages. */
  details?: unknown
}

// Normalize any thrown value (axios error, Error, unknown) into an ApiError. Use
// in catch blocks: `toast.error(toApiError(e).message)`.
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiError> | undefined
    if (data && typeof data.message === 'string') {
      return {
        statusCode: data.statusCode ?? error.response?.status ?? 0,
        error: data.error ?? error.name,
        message: data.message,
        details: data.details,
      }
    }
    return {
      statusCode: error.response?.status ?? 0,
      error: error.code ?? 'NetworkError',
      message: error.message,
    }
  }
  if (error instanceof Error) {
    return { statusCode: 0, error: error.name, message: error.message }
  }
  return { statusCode: 0, error: 'UnknownError', message: 'Bilinmeyen hata' }
}
