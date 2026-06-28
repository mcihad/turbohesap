// POS register (kasa/terminal) — a sale point bound to a branch, optionally to a
// sales channel (then only that channel's products/prices are used). Per-register
// config lives here (there is no global settings store).

import type { BranchSummary } from '../org/branch.dto'

export interface PosRegisterSettings {
  /** Cart panel side; product grid takes the other side. */
  cartSide: 'left' | 'right'
  /** Shelf prices include VAT (Turkey retail default). */
  taxInclusive: boolean
  /** Route lines to the kitchen display (restaurant mode). */
  kitchenEnabled: boolean
  receiptHeader: string
  receiptFooter: string
}

export const DEFAULT_REGISTER_SETTINGS: PosRegisterSettings = {
  cartSide: 'right',
  taxInclusive: true,
  kitchenEnabled: false,
  receiptHeader: '',
  receiptFooter: '',
}

export interface PosRegisterDto {
  id: string
  name: string
  code: string
  branchId: string
  branch: BranchSummary | null
  salesChannelId: string | null
  salesChannel: { id: string; name: string } | null
  defaultCashAccountId: string | null
  settings: PosRegisterSettings
  isActive: boolean
  /** COMPUTED: id of the currently open session on this register, if any. */
  openSessionId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePosRegisterRequest {
  name: string
  code?: string
  branchId: string
  salesChannelId?: string | null
  defaultCashAccountId?: string | null
  settings?: Partial<PosRegisterSettings>
  isActive?: boolean
}
export type UpdatePosRegisterRequest = Partial<CreatePosRegisterRequest>
