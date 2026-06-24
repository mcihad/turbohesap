import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

// Marks a route as not requiring authentication (the global JwtAuthGuard skips
// it). Used for login/refresh/logout and health.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
