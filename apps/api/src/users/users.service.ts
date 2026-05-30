import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOrCreate(identifier: string, type: 'email' | 'phone') {
    const where = type === 'email' ? { email: identifier } : { telefone: identifier };
    const existing = await this.prisma.user.findUnique({ where });
    if (existing) return { user: existing, isNewUser: false };

    const data = type === 'email' ? { email: identifier } : { telefone: identifier };
    const user = await this.prisma.user.create({ data });
    return { user, isNewUser: true };
  }

  updateProfile(userId: number, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nome: dto.nome.trim(),
        cpf: dto.cpf.trim(),
        email: dto.email?.trim() || undefined,
        telefone: dto.telefone?.trim() || undefined,
      },
    });
  }
}
