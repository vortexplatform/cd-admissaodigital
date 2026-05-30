import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findSessionById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        empresas: {
          include: { empresa: true },
          orderBy: { empresa: { nome: 'asc' } },
        },
      },
    });

    if (!user) return null;

    const { empresas: vinculos, ...userData } = user;
    const empresas = vinculos.map((vinculo) => vinculo.empresa);

    return {
      user: userData,
      empresas,
      empresaAtiva: empresas[0] ?? null,
    };
  }

  async findOrCreate(identifier: string, type: 'email' | 'phone') {
    const where = type === 'email' ? { email: identifier } : { telefone: identifier };
    const existing = await this.prisma.user.findUnique({ where });
    if (existing) return { user: existing, isNewUser: false };

    const data = type === 'email' ? { email: identifier } : { telefone: identifier };
    const user = await this.prisma.user.create({ data });
    return { user, isNewUser: true };
  }

  async createAdminUser(dto: CreateAdminUserDto) {
    const email = dto.email?.trim() || undefined;
    const telefone = dto.telefone?.trim() || undefined;
    if (!email && !telefone) throw new BadRequestException('Informe e-mail ou telefone.');

    const empresa = await this.prisma.empresa.findUnique({ where: { id: dto.empresaId } });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');

    return this.prisma.user.create({
      data: {
        nome: dto.nome.trim(),
        cpf: dto.cpf.trim(),
        email,
        telefone,
        role: dto.role ?? Role.RH,
        empresas: {
          create: { empresaId: dto.empresaId },
        },
      },
      include: {
        empresas: {
          include: { empresa: true },
        },
      },
    });
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
