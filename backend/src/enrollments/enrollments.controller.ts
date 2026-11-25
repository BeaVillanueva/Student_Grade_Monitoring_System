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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateEnrollmentDto,
  EnrollmentIdDto,
  EnrollmentListDto,
  ReplaceEnrollmentDto,
} from './dto/enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post()
  @Roles('Admin', 'Department Head')
  create(
    @Body() input: CreateEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.create(input, actor.userId);
  }

  @Get()
  list(
    @Query() query: EnrollmentListDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.list(query, actor);
  }

  @Get(':id')
  findOne(
    @Param() params: EnrollmentIdDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.findOne(params.id, actor);
  }

  @Put(':id')
  @Roles('Admin', 'Department Head')
  replace(
    @Param() params: EnrollmentIdDto,
    @Body() input: ReplaceEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.replace(params.id, input, actor.userId);
  }

  @Delete(':id')
  @Roles('Admin', 'Department Head')
  @HttpCode(204)
  async remove(
    @Param() params: EnrollmentIdDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.enrollments.remove(params.id, actor.userId);
  }
}
