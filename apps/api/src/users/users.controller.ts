import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: { user: { id: number } }, @Body() dto: UpdateMeDto) {
    return this.users.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.users.findAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin')
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.users.createAdminUser(dto);
  }
}
