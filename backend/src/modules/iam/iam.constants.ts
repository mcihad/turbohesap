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
  // Standart "Personel" self-servis rolü — İK personeli için otomatik kullanıcı
  // oluşturulurken atanır: kendi vardiya takvimini görme + mobil giriş/çıkış +
  // zimmetli demirbaşlarını görme ve devretme/devralma.
  personel: {
    name: 'personel',
    description: 'Personel self-servis (vardiya, giriş/çıkış, zimmet)',
    module: 'hr',
    permissions: [
      'hr.attendance.checkin',
      'hr.shifts.read',
      'inventory.assets.read',
      'inventory.assets.assign',
    ],
  },
} as const
