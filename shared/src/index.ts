// @kentos/shared — the contract layer shared by the web frontend and the future
// React Native app. It carries three things:
//   1. models/   — DTOs exchanged with the backend (the wire shapes)
//   2. services/ — framework-agnostic service interfaces (the contracts)
//   3. clients/  — axios-based implementations of those interfaces
//
// The NestJS backend implements the same contracts on the server side and
// imports the DTOs so both halves stay in lockstep.

export * from './models'
export * from './services'
export * from './clients'
export * from './http/client'
