import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(100)
  email: string;

  // Preserve password whitespace; bcrypt only accepts up to 72 UTF-8 bytes.
  @IsString()
  @IsByteLength(1, 72)
  password: string;
}
