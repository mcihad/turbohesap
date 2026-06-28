// POS (point of sale) module contracts — registers, sessions, orders, payments,
// fine-grained permissions, and pure pricing helpers. Re-exported from the barrel.
export * from './pos.permissions'
export * from './register.dto'
export * from './session.dto'
export * from './order.dto'
export * from './table.dto'
export * from './pos-pricing.helpers'

export * from './registers.service'
export * from './registers.client'
export * from './sessions.service'
export * from './sessions.client'
export * from './orders.service'
export * from './orders.client'
export * from './tables.service'
export * from './tables.client'
