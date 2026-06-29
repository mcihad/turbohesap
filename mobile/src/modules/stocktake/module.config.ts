import { StocktakePermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

// Sayım (stok/envanter sayımı) — plan a count session, count by barcode scanning
// (the star CountScanScreen), then review & approve to post the stock adjustment.
// A single list item drills into the count list; the detail screen exposes the
// start/review/approve/cancel lifecycle actions and the scanner.
export const stocktakeModule: MobileModule = {
  key: 'stocktake',
  label: 'Sayım',
  icon: 'maximize',
  home: 'stocktake.home',
  permission: StocktakePermissions.read,
  items: [
    {
      key: 'stocktake.counts',
      title: 'Sayımlar',
      icon: 'maximize',
      description: 'Stok sayım oturumları',
      permission: StocktakePermissions.read,
    },
  ],
}
