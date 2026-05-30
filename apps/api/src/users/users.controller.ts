import { Body, Controller, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
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
  @Post('admin')
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.users.createAdminUser(dto);
  }
}
