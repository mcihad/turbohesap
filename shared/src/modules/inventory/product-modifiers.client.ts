import type { AxiosInstance } from 'axios'

import type {
  CreateModifierGroupRequest,
  CreateModifierOptionRequest,
  ProductModifierGroupDto,
  ProductModifierOptionDto,
  SetProductModifiersRequest,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest,
} from './product-modifier.dto'
import type { IProductModifiersService } from './product-modifiers.service'

const groups = '/inventory/modifier-groups'

export class ProductModifiersApiClient implements IProductModifiersService {
  constructor(private readonly http: AxiosInstance) {}

  async listGroups(): Promise<ProductModifierGroupDto[]> {
    return (await this.http.get<ProductModifierGroupDto[]>(groups)).data
  }
  async getGroup(id: string): Promise<ProductModifierGroupDto> {
    return (await this.http.get<ProductModifierGroupDto>(`${groups}/${id}`)).data
  }
  async createGroup(input: CreateModifierGroupRequest): Promise<ProductModifierGroupDto> {
    return (await this.http.post<ProductModifierGroupDto>(groups, input)).data
  }
  async updateGroup(id: string, input: UpdateModifierGroupRequest): Promise<ProductModifierGroupDto> {
    return (await this.http.patch<ProductModifierGroupDto>(`${groups}/${id}`, input)).data
  }
  async removeGroup(id: string): Promise<void> {
    await this.http.delete(`${groups}/${id}`)
  }
  async addOption(
    groupId: string,
    input: CreateModifierOptionRequest,
  ): Promise<ProductModifierOptionDto> {
    return (await this.http.post<ProductModifierOptionDto>(`${groups}/${groupId}/options`, input))
      .data
  }
  async updateOption(
    groupId: string,
    optionId: string,
    input: UpdateModifierOptionRequest,
  ): Promise<ProductModifierOptionDto> {
    return (
      await this.http.patch<ProductModifierOptionDto>(
        `${groups}/${groupId}/options/${optionId}`,
        input,
      )
    ).data
  }
  async removeOption(groupId: string, optionId: string): Promise<void> {
    await this.http.delete(`${groups}/${groupId}/options/${optionId}`)
  }
  async productMap(): Promise<Record<string, string[]>> {
    return (await this.http.get<Record<string, string[]>>('/inventory/modifier-map')).data
  }
  async listForProduct(productId: string): Promise<ProductModifierGroupDto[]> {
    return (
      await this.http.get<ProductModifierGroupDto[]>(`/inventory/products/${productId}/modifiers`)
    ).data
  }
  async setForProduct(
    productId: string,
    input: SetProductModifiersRequest,
  ): Promise<ProductModifierGroupDto[]> {
    return (
      await this.http.put<ProductModifierGroupDto[]>(
        `/inventory/products/${productId}/modifiers`,
        input,
      )
    ).data
  }
}
