import { ProductionPermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

// Üretim (manufacturing / MRP) — reçete (BOM) + iş merkezi master data, Üretim
// Emri (MO) lifecycle, saha terminali (İş Emri: başlat/duraklat/bitir + barkod),
// fason sevk, MRP planlama, kalite ve parti/seri izlenebilirlik. Each item drills
// into its own screen (registered under its screen key). Reorder rules are reached
// from the planning screen; fasoncudaki stok from the fason list.
export const productionModule: MobileModule = {
  key: 'production',
  label: 'Üretim',
  icon: 'settings',
  home: 'production.home',
  permission: ProductionPermissions.read,
  items: [
    {
      key: 'production.orders',
      title: 'Üretim Emirleri',
      icon: 'clipboard',
      description: 'Mamul üretim emirleri',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.workorders',
      title: 'İş Emirleri',
      icon: 'tool',
      description: 'Saha terminali — başlat/bitir',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.boms',
      title: 'Reçeteler',
      icon: 'git-merge',
      description: 'Ürün ağaçları (BOM)',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.workcenters',
      title: 'İş İstasyonları',
      icon: 'cpu',
      description: 'İstasyon ve saat ücretleri',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.subcontract',
      title: 'Fason',
      icon: 'send',
      description: 'Fason sevk ve teslim',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.planning',
      title: 'Planlama',
      icon: 'trending-up',
      description: 'MRP koşuları ve öneriler',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.quality',
      title: 'Kalite',
      icon: 'check-circle',
      description: 'Kalite kontrol kayıtları',
      permission: ProductionPermissions.read,
    },
    {
      key: 'production.lots',
      title: 'Parti/Seri',
      icon: 'hash',
      description: 'İzlenebilirlik ve şecere',
      permission: ProductionPermissions.read,
    },
  ],
}
