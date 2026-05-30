import { Body, Controller, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
}
