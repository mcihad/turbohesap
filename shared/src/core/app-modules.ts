// The catalog of application modules. Each ERP module groups resources under
// /api/<module>/<resource> and, on the web, a section reachable from the left
// module rail. Roles are scoped to a module (RoleDto.module).
//
// This is the canonical list (key + Turkish label + description); the web app's
// module registry adds the icon and navigation per key.

export interface AppModuleInfo {
  key: string
  label: string
  description: string
}

export const MODULES: AppModuleInfo[] = [
  {
    key: 'genel',
    label: 'Genel',
    description: 'Genel bakış, panolar ve raporlar',
  },
  {
    key: 'iam',
    label: 'Yönetim',
    description: 'Kullanıcı, rol ve izin yönetimi',
  },
  {
    key: 'components',
    label: 'Bileşenler',
    description: 'Arayüz bileşeni önizlemeleri',
  },
]

export const MODULE_KEYS: string[] = MODULES.map((m) => m.key)
