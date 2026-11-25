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
import { PageQueryDto, RecordIdDto } from '../common/dto/academic-query.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() @Roles('Admin', 'Department Head') list(
    @Query() query: PageQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.list(query, actor);
  }
  @Get(':id') findOne(
    @Param() params: RecordIdDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.findOne(params.id, actor);
  }
  @Post() @Roles('Admin') create(
    @Body() input: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.create(input, actor.userId);
  }
  @Patch(':id') @Roles('Admin') update(
    @Param() params: RecordIdDto,
    @Body() input: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.update(params.id, input, actor.userId);
  }
}
