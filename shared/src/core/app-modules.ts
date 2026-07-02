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
    key: 'sales',
    label: 'Satış',
    description: 'Satış kanalları ve satış tanımları',
  },
  {
    key: 'org',
    label: 'Organizasyon',
    description: 'Şubeler ve organizasyon tanımları',
  },
  {
    key: 'inventory',
    label: 'Envanter',
    description: 'Kategoriler ve stok/ürün yönetimi',
  },
  {
    key: 'lookups',
    label: 'Tanımlar',
    description: 'Genel tanımlar: key/value listeleri (birim, renk vb.) ve fazlası',
  },
  {
    key: 'finance',
    label: 'Finans',
    description: 'Kasa, banka ve finansal işlemler',
  },
  {
    key: 'contacts',
    label: 'Cari',
    description: 'Müşteri, tedarikçi, cari hesap ve CRM',
  },
  {
    key: 'invoices',
    label: 'Fatura',
    description: 'Satış/alış faturaları, KDV ve tevkifat',
  },
  {
    key: 'pos',
    label: 'POS',
    description: 'Hızlı satış noktası, kasa/vardiya ve mutfak ekranı',
  },
  {
    key: 'production',
    label: 'Üretim',
    description: 'Reçete (BOM), iş merkezi, üretim/iş emri, fason, MRP',
  },
]

export const MODULE_KEYS: string[] = MODULES.map((m) => m.key)
