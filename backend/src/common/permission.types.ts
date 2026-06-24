// A permission definition contributed by a module. Keys follow
// "<module>.<resource>.<action>" (e.g. "iam.users.read").
export interface PermissionDef {
  key: string
  description: string
  group: string
}
