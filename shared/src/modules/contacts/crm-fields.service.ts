import type {
  CrmFieldDefsDto,
  CrmFieldEntity,
  SetCrmFieldDefsRequest,
} from './crm-fields.dto'

export interface ICrmFieldsService {
  get(entity: CrmFieldEntity): Promise<CrmFieldDefsDto>
  set(entity: CrmFieldEntity, input: SetCrmFieldDefsRequest): Promise<CrmFieldDefsDto>
}
