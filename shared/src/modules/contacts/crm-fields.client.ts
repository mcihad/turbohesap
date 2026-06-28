import type { AxiosInstance } from 'axios'

import type {
  CrmFieldDefsDto,
  CrmFieldEntity,
  SetCrmFieldDefsRequest,
} from './crm-fields.dto'
import type { ICrmFieldsService } from './crm-fields.service'

export class CrmFieldsApiClient implements ICrmFieldsService {
  constructor(private readonly http: AxiosInstance) {}

  async get(entity: CrmFieldEntity): Promise<CrmFieldDefsDto> {
    return (await this.http.get<CrmFieldDefsDto>(`/contacts/field-defs/${entity}`)).data
  }
  async set(entity: CrmFieldEntity, input: SetCrmFieldDefsRequest): Promise<CrmFieldDefsDto> {
    return (await this.http.put<CrmFieldDefsDto>(`/contacts/field-defs/${entity}`, input)).data
  }
}
