import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const positiveInteger = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;

export class CreateSubjectDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Z0-9][A-Z0-9 _-]*$/)
  subjectCode: string;

  @Transform(trim)
  @IsString()
  @Length(1, 100)
  @Matches(/^[^\u0000-\u001f\u007f]+$/)
  subjectName: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  units: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  facultyId: number;
}

// PUT deliberately inherits ALL required fields, not a partial update DTO.
export class ReplaceSubjectDto extends CreateSubjectDto {}

export class SubjectIdDto {
  @Transform(positiveInteger)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}

export class SubjectListDto {
  @Transform(positiveInteger)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @Transform(positiveInteger)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}
