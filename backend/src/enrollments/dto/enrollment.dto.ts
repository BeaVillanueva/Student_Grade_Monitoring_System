import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateBy,
} from 'class-validator';
import type { EnrollmentStatus } from '../../database/domain';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const integerQuery = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;

export class ReplaceEnrollmentDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  studentId: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  subjectId: number;

  @Transform(trim)
  @IsString()
  @Length(1, 20)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  semester: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  @ValidateBy({
    name: 'consecutiveSchoolYear',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        /^\d{4}-\d{4}$/.test(value) &&
        Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
    },
  })
  schoolYear: string;

  @IsIn(['Enrolled', 'Dropped', 'Completed'])
  status: EnrollmentStatus;
}

export class CreateEnrollmentDto extends ReplaceEnrollmentDto {
  @IsDateString({ strict: true })
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  dateEnrolled: string;
}

export class EnrollmentIdDto {
  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}

export class EnrollmentListDto {
  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsOptional()
  @Transform(integerQuery)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  studentId?: number;
}
