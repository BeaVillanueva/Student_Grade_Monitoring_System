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
import { CreateInquiryDto, ResolveInquiryDto } from './dto/inquiry.dto';
import { GradeInquiriesService } from './grade-inquiries.service';
@Controller('grade-inquiries')
export class GradeInquiriesController {
  constructor(private readonly inquiries: GradeInquiriesService) {}
  @Get() list(
    @Query() query: StudentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inquiries.list(query, actor);
  }
  @Post() @Roles('Student') create(
    @Body() input: CreateInquiryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inquiries.create(input, actor.userId);
  }
  @Patch(':id') @Roles('Faculty', 'Admin') resolve(
    @Param() params: RecordIdDto,
    @Body() input: ResolveInquiryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inquiries.resolve(params.id, input, actor.userId);
  }
}
