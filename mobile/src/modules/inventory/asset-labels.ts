// Shared UI helpers for the Demirbaş & Zimmet (fixed assets + custody) screens —
// status → badge tone maps so colour usage stays consistent and token-driven
// (the Badge component resolves tones to theme colours; no hardcoded colours).

import type { AssetStatus, AssetTransferStatus } from '@turbohesap/shared'

import type { BadgeTone } from '../../components'

// Asset lifecycle status → badge tone.
export function assetStatusTone(status: AssetStatus): BadgeTone {
  switch (status) {
    case 'depoda':
      return 'info'
    case 'zimmetli':
      return 'primary'
    case 'bakimda':
      return 'warning'
    case 'kayip':
    case 'hurda':
      return 'destructive'
    case 'cikis':
    case 'pasif':
    default:
      return 'muted'
  }
}

// Transfer handshake status → badge tone.
export function transferStatusTone(status: AssetTransferStatus): BadgeTone {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'accepted':
      return 'success'
    case 'rejected':
    case 'expired':
      return 'destructive'
    case 'cancelled':
    default:
      return 'muted'
  }
}
