import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateInquiryDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  gradeId: number;
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  @IsByteLength(1, 16000)
  @Matches(/^[^\u0000]+$/)
  message: string;
}
export class ResolveInquiryDto {
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  @IsByteLength(1, 16000)
  @Matches(/^[^\u0000]+$/)
  resolutionNote: string;
}
