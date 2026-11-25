import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { GradeType } from '../../database/domain';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateGradeDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  enrollmentId: number;
  @IsIn(['Midterm', 'Final'])
  gradeType: GradeType;
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(100)
  score: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  remarks?: string | null;
}
export class UpdateGradeDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['Midterm', 'Final'])
  gradeType?: GradeType;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(100)
  score?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  remarks?: string | null;
}
