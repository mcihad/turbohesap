// Generic pagination envelope, shared by list endpoints that page (e.g. the
// audit / error logs). Keeping it in core so every module returns the same shape.
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
}
