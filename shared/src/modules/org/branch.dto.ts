// Branch — a physical location of the organization (head office, store,
// warehouse, …). Master data: users are authorized for one or more branches
// (see iam UserDto.branches). The wire shape shared by backend, web and mobile.

// The kind of location. Stored as a string; the UI maps each to a Turkish label.
export type BranchType =
  | 'headquarter' // Merkez
  | 'branch' // Şube
  | 'store' // Mağaza
  | 'warehouse' // Depo
  | 'office' // Ofis
  | 'factory' // Fabrika

export const BRANCH_TYPES: BranchType[] = [
  'headquarter',
  'branch',
  'store',
  'warehouse',
  'office',
  'factory',
]

export interface BranchDto {
  id: string
  /** Unique short code (e.g. "IST-01", "MERKEZ"). */
  code: string
  name: string
  type: BranchType
  description: string
  isActive: boolean

  // İletişim (contact)
  phone: string
  secondaryPhone: string
  fax: string
  email: string
  website: string

  // Adres (address)
  country: string
  city: string
  district: string
  neighborhood: string
  addressLine: string
  postalCode: string
  /** Optional geolocation, for maps. */
  latitude: number | null
  longitude: number | null

  // Yetkili / Şube müdürü (authorized person / branch manager)
  managerName: string
  managerTitle: string
  managerPhone: string
  managerEmail: string

  // Yasal / Vergi (legal / tax)
  taxOffice: string
  taxNumber: string

  /** ISO date-time the branch opened (or null). */
  openingDate: string | null

  createdAt: string
  updatedAt: string
}

// Compact reference embedded in other modules' DTOs (e.g. iam UserDto.branches).
export interface BranchSummary {
  id: string
  code: string
  name: string
  city: string
}

export interface CreateBranchRequest {
  code: string
  name: string
  type?: BranchType
  description?: string
  isActive?: boolean
  phone?: string
  secondaryPhone?: string
  fax?: string
  email?: string
  website?: string
  country?: string
  city?: string
  district?: string
  neighborhood?: string
  addressLine?: string
  postalCode?: string
  latitude?: number | null
  longitude?: number | null
  managerName?: string
  managerTitle?: string
  managerPhone?: string
  managerEmail?: string
  taxOffice?: string
  taxNumber?: string
  openingDate?: string | null
}

export type UpdateBranchRequest = Partial<CreateBranchRequest>
