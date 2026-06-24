import { ALL_PERMISSION_KEYS } from '../../permissions.catalog'

// Varsayılan sistem rolleri. `admin` tüm izinlere sahiptir (katalogdan türetilir,
// yeni izinler eklendikçe otomatik kapsar); `user` minimum okuma rolüdür. İkisi
// de "iam" (Yönetim) modülüne aittir. İzin kataloğu için bkz. permissions.catalog.ts.
export const SYSTEM_ROLES = {
  admin: {
    name: 'admin',
    description: 'Tam sistem erişimi',
    module: 'iam',
    permissions: ALL_PERMISSION_KEYS,
  },
  user: {
    name: 'user',
    description: 'Standart kullanıcı',
    module: 'iam',
    permissions: ['iam.users.read'],
  },
} as const
