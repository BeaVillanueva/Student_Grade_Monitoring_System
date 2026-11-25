import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
export class RecordIdDto {
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}
export class PageQueryDto {
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}
export class StudentQueryDto extends PageQueryDto {
  @IsOptional()
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  studentId?: number;
}
export function paginated<T>(data: T[], total: number, query: PageQueryDto) {
  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
