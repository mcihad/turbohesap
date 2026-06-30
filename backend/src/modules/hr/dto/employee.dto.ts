import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

import {
  EMPLOYMENT_TYPES,
  SALARY_TYPES,
  SGK_STATUSES,
  type CreateEmployeeRequest,
  type CreateEmployeeUserRequest,
  type EmploymentType,
  type SalaryType,
  type SgkStatus,
  type UpdateEmployeeRequest,
} from '@turbohesap/shared'

// Inline user creation when adding a personel with no existing user.
export class CreateEmployeeUserDto implements CreateEmployeeUserRequest {
  @IsString() @IsNotEmpty() username!: string
  @IsEmail() email!: string
  @IsString() @MinLength(6) password!: string
}

export class CreateEmployeeDto implements CreateEmployeeRequest {
  @IsString() @IsNotEmpty() firstName!: string
  @IsString() @IsNotEmpty() lastName!: string
  @IsOptional() @IsString() tcKimlikNo?: string
  @IsOptional() @IsString() birthDate?: string | null
  @IsString() @IsNotEmpty() hireDate!: string
  @IsOptional() @IsString() terminationDate?: string | null
  @IsOptional() @IsString() departmentKey?: string | null
  @IsOptional() @IsString() positionKey?: string | null
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: EmploymentType
  @IsOptional() @IsIn(SALARY_TYPES) salaryType?: SalaryType
  @IsNumber() @Min(0) salaryAmount!: number
  @IsOptional() @IsString() sgkSicilNo?: string | null
  @IsOptional() @IsIn(SGK_STATUSES) sgkStatus?: SgkStatus
  @IsOptional() @IsString() iban?: string | null
  @IsOptional() @IsString() bankName?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() address?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() userId?: string | null
  @IsOptional() @ValidateNested() @Type(() => CreateEmployeeUserDto) createUser?: CreateEmployeeUserDto
  @IsOptional() @IsString() cardNo?: string | null
  @IsOptional() @IsInt() @Min(0) annualLeaveDays?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() notes?: string | null
}

export class UpdateEmployeeDto implements UpdateEmployeeRequest {
  @IsOptional() @IsString() @IsNotEmpty() firstName?: string
  @IsOptional() @IsString() @IsNotEmpty() lastName?: string
  @IsOptional() @IsString() tcKimlikNo?: string
  @IsOptional() @IsString() birthDate?: string | null
  @IsOptional() @IsString() hireDate?: string
  @IsOptional() @IsString() terminationDate?: string | null
  @IsOptional() @IsString() departmentKey?: string | null
  @IsOptional() @IsString() positionKey?: string | null
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: EmploymentType
  @IsOptional() @IsIn(SALARY_TYPES) salaryType?: SalaryType
  @IsOptional() @IsNumber() @Min(0) salaryAmount?: number
  @IsOptional() @IsString() sgkSicilNo?: string | null
  @IsOptional() @IsIn(SGK_STATUSES) sgkStatus?: SgkStatus
  @IsOptional() @IsString() iban?: string | null
  @IsOptional() @IsString() bankName?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() address?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() userId?: string | null
  @IsOptional() @ValidateNested() @Type(() => CreateEmployeeUserDto) createUser?: CreateEmployeeUserDto
  @IsOptional() @IsString() cardNo?: string | null
  @IsOptional() @IsInt() @Min(0) annualLeaveDays?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() notes?: string | null
}
