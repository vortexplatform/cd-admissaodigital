import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const normalizeCpf = (value?: string | null) => {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length === 11 ? digits : null;
};

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

  async findOrCreate(identifier: string, type: 'email' | 'phone', cpf: string) {
    const normalizedCpf = normalizeCpf(cpf);
    if (!normalizedCpf) throw new BadRequestException('CPF inválido.');

    const userByCpf = await this.prisma.user.findUnique({ where: { cpf: normalizedCpf } });
    if (userByCpf) {
      const userWithIdentifier = await this.prisma.user.update({
        where: { id: userByCpf.id },
        data: this.buildIdentifierUpdate(type, identifier, userByCpf.email, userByCpf.telefone),
      });
      const user = await this.linkCandidatoByCpf(userWithIdentifier.id, normalizedCpf);
      return { user: user ?? userWithIdentifier, isNewUser: false };
    }

    const user = await this.prisma.user.create({
      data: {
        cpf: normalizedCpf,
        ...this.buildIdentifierCreate(type, identifier),
      },
    });
    const linkedUser = await this.linkCandidatoByCpf(user.id, normalizedCpf);
    return { user: linkedUser ?? user, isNewUser: true };
  }

  private buildIdentifierCreate(type: 'email' | 'phone', identifier: string) {
    return type === 'email' ? { email: identifier } : { telefone: identifier };
  }

  private buildIdentifierUpdate(
    type: 'email' | 'phone',
    identifier: string,
    email?: string | null,
    telefone?: string | null,
  ) {
    return type === 'email'
      ? { email: email ?? identifier }
      : { telefone: telefone ?? identifier };
  }

  async linkCandidatoByCpf(userId: number, cpf: string) {
    const normalizedCpf = normalizeCpf(cpf);
    if (!normalizedCpf) return null;

    const candidato = await this.prisma.candidato.findUnique({ where: { cpf: normalizedCpf } });
    if (!candidato || (candidato.userId && candidato.userId !== userId)) return null;

    await this.prisma.candidato.update({ where: { id: candidato.id }, data: { userId } });

    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async createAdminUser(dto: CreateAdminUserDto) {
    const email = dto.email?.trim() || undefined;
    const telefone = dto.telefone?.trim() || undefined;
    if (!email && !telefone) throw new BadRequestException('Informe e-mail ou telefone.');

    const empresa = await this.prisma.empresa.findUnique({ where: { id: dto.empresaId } });
    if (!empresa) throw new BadRequestException('Empresa não encontrada.');
    if (dto.role && dto.role !== Role.RH && dto.role !== Role.ADMIN) {
      throw new BadRequestException('Apenas usuários RH ou ADMIN podem ser criados por esta tela.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        nome: dto.nome.trim(),
        cpf: dto.cpf.trim(),
        email,
        telefone,
        role: dto.role ?? Role.RH,
        passwordHash,
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

  async updateUser(userId: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado.');

    if (dto.role && dto.role !== Role.RH && dto.role !== Role.ADMIN) {
      throw new BadRequestException('Apenas perfis RH ou ADMIN são permitidos.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.RH, Role.ADMIN] } },
      include: {
        empresas: {
          include: { empresa: true },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async updateProfile(userId: number, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado.');

    const cpf = normalizeCpf(dto.cpf);
    if (!cpf) throw new BadRequestException('CPF inválido.');
    if (user.cpf && user.cpf !== cpf) throw new BadRequestException('CPF não pode ser alterado.');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nome: dto.nome.trim(),
        cpf: user.cpf ?? cpf,
        email: dto.email?.trim() || undefined,
        telefone: dto.telefone?.trim() || undefined,
      },
    });

    await this.linkCandidatoByCpf(userId, updatedUser.cpf ?? cpf);
    return updatedUser;
  }
}
