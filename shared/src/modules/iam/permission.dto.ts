// A single granular capability, keyed as "<module>.<resource>.<action>"
// (e.g. "iam.users.read").
export interface PermissionDto {
  key: string
  description: string
  group: string
}
