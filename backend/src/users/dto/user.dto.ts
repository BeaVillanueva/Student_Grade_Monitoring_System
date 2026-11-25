import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ROLES } from '../../database/domain';
import type { AccountStatus, UserRole } from '../../database/domain';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  firstName: string;
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  lastName: string;
  @Transform(email)
  @IsEmail()
  @MaxLength(100)
  email: string;
  @IsString()
  @MinLength(8)
  @IsByteLength(8, 72)
  password: string;
  @IsIn(ROLES)
  role: UserRole;
  @IsIn(['Active', 'Inactive'])
  accountStatus: AccountStatus;
}
export class UpdateUserDto {
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  firstName?: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  lastName?: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @Transform(email)
  @IsEmail()
  @MaxLength(100)
  email?: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @IsString()
  @MinLength(8)
  @IsByteLength(8, 72)
  password?: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @IsIn(ROLES)
  role?: UserRole;
  @ValidateIf((_obj, value) => value !== undefined)
  @IsIn(['Active', 'Inactive'])
  accountStatus?: AccountStatus;
}
