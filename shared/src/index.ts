// @turbohesap/shared — the contract layer shared by the NestJS backend, the web
// frontend and the React Native app. It holds, per module, the two things every
// client and the server must agree on:
//
//   • Data Transfer Objects (DTOs) — the wire shapes (e.g. *.dto.ts)
//   • Service interfaces — the contracts (e.g. *.service.ts), plus their
//     axios client implementations (*.client.ts)
//
// Layout mirrors the backend so modules stay cleanly separated:
//   src/core/            — http client, module catalog, createTurbohesapApi()
//   src/modules/<module> — that module's DTOs + service interfaces + clients
//
// Adding a module: create src/modules/<module>/ with its *.dto.ts +
// *.service.ts + *.client.ts (+ index.ts), export it below, and register its
// client in src/core/api.ts. The backend implements the same contracts and
// imports the DTOs from here, so server and clients never drift.

export * from './core'
export * from './modules/auth'
export * from './modules/iam'
export * from './modules/health'
export * from './modules/contacts'
export * from './modules/invoices'
export * from './modules/pos'
export * from './modules/sales'
export * from './modules/org'
export * from './modules/lookups'
export * from './modules/inventory'
export * from './modules/files'
export * from './modules/settings'
export * from './modules/finance'
export * from './modules/feedback'
export * from './modules/reports'
export * from './modules/orders'
export * from './modules/hr'
export * from './modules/stocktake'
export * from './modules/production'
