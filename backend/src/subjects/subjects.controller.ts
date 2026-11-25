import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import {
  CreateSubjectDto,
  ReplaceSubjectDto,
  SubjectIdDto,
  SubjectListDto,
} from './dto/subject.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Post()
  @Roles('Admin', 'Department Head')
  create(
    @Body() input: CreateSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subjects.create(input, actor.userId);
  }

  @Get()
  list(@Query() query: SubjectListDto) {
    return this.subjects.list(query);
  }

  @Get(':id')
  findOne(@Param() params: SubjectIdDto) {
    return this.subjects.findOne(params.id);
  }

  @Put(':id')
  @Roles('Admin', 'Department Head')
  replace(
    @Param() params: SubjectIdDto,
    @Body() input: ReplaceSubjectDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subjects.replace(params.id, input, actor.userId);
  }

  @Delete(':id')
  @Roles('Admin', 'Department Head')
  @HttpCode(204)
  async remove(
    @Param() params: SubjectIdDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.subjects.remove(params.id, actor.userId);
  }
}
