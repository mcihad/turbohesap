import { Allow, IsDefined } from 'class-validator'

import type { SetUserSettingRequest } from '@turbohesap/shared'

// Body for PUT /api/settings/:type. `data` is arbitrary jsonb — accepted as-is.
export class SetSettingDto implements SetUserSettingRequest {
  @IsDefined()
  @Allow()
  data!: unknown
}
