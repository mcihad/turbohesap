import { StocktakePermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Granular by design for segregation of duties: the person who counts
// (stocktake.count) must not be the person who approves the adjustment
// (stocktake.approve) — enforced in the service on approve().
export const STOCKTAKE_PERMISSION_DEFS: PermissionDef[] = [
  { key: StocktakePermissions.read, description: 'Sayım belgelerini görüntüleme (Stok/Envanter Sayımı)', group: 'stocktake' },
  { key: StocktakePermissions.create, description: 'Sayım planlama / oluşturma ve başlatma', group: 'stocktake' },
  { key: StocktakePermissions.count, description: 'Fiziki sayım yapma (barkod okutma / miktar girme)', group: 'stocktake' },
  { key: StocktakePermissions.review, description: 'Farkları inceleme, yeniden sayım isteme, neden kodu girme', group: 'stocktake' },
  { key: StocktakePermissions.approve, description: 'Sayımı onaylama ve stok düzeltmelerini işleme (Fazla/Eksik)', group: 'stocktake' },
  { key: StocktakePermissions.cancel, description: 'Sayımı iptal etme (işlenmişse stok hareketlerini geri alır)', group: 'stocktake' },
]
