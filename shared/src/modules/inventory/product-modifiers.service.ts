import type {
  CreateModifierGroupRequest,
  CreateModifierOptionRequest,
  ProductModifierGroupDto,
  ProductModifierOptionDto,
  SetProductModifiersRequest,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest,
} from './product-modifier.dto'

export interface IProductModifiersService {
  listGroups(): Promise<ProductModifierGroupDto[]>
  getGroup(id: string): Promise<ProductModifierGroupDto>
  createGroup(input: CreateModifierGroupRequest): Promise<ProductModifierGroupDto>
  updateGroup(id: string, input: UpdateModifierGroupRequest): Promise<ProductModifierGroupDto>
  removeGroup(id: string): Promise<void>
  addOption(groupId: string, input: CreateModifierOptionRequest): Promise<ProductModifierOptionDto>
  updateOption(
    groupId: string,
    optionId: string,
    input: UpdateModifierOptionRequest,
  ): Promise<ProductModifierOptionDto>
  removeOption(groupId: string, optionId: string): Promise<void>
  /** Groups attached to a product (ordered) — drives the POS modifier sheet. */
  /** Map of productId → attached modifier-group ids. Lets the POS decide at a
   *  glance whether a tapped product needs the options sheet (no per-product
   *  fetch). Only products with ≥1 group appear. */
  productMap(): Promise<Record<string, string[]>>
  listForProduct(productId: string): Promise<ProductModifierGroupDto[]>
  setForProduct(
    productId: string,
    input: SetProductModifiersRequest,
  ): Promise<ProductModifierGroupDto[]>
}
