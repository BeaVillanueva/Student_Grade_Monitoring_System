import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RecordIdDto, StudentQueryDto } from '../common/dto/academic-query.dto';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';
import { GradesService } from './grades.service';
@Controller('grades')
export class GradesController {
  constructor(private readonly grades: GradesService) {}
  @Get() list(
    @Query() query: StudentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.grades.list(query, actor);
  }
  @Post() @Roles('Faculty') create(
    @Body() input: CreateGradeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.grades.create(input, actor.userId);
  }
  @Patch(':id') @Roles('Faculty') update(
    @Param() params: RecordIdDto,
    @Body() input: UpdateGradeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.grades.update(params.id, input, actor.userId);
  }
}
