import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEmpresaDto) {
    return this.prisma.empresa.create({
      data: {
        nome: dto.nome.trim(),
        codigoEmpresaSenior: dto.codigoEmpresaSenior.trim(),
      },
    });
  }

  findAll() {
    return this.prisma.empresa.findMany({ orderBy: { nome: 'asc' } });
  }

  findUsuarios(id: number) {
    return this.prisma.empresaUsuario.findMany({
      where: { empresaId: id },
      include: { user: true },
      orderBy: { user: { nome: 'asc' } },
    });
  }

  async findOne(id: number) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    return empresa;
  }

  async update(id: number, dto: UpdateEmpresaDto) {
    await this.findOne(id);

    return this.prisma.empresa.update({
      where: { id },
      data: {
        nome: dto.nome?.trim(),
        codigoEmpresaSenior: dto.codigoEmpresaSenior?.trim(),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.empresa.delete({ where: { id } });

    return { deleted: true };
  }

  async vincularUsuario(id: number, userId: number) {
    await this.findOne(id);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role !== Role.RH && user.role !== Role.ADMIN) {
      throw new BadRequestException('Apenas usuários RH ou ADMIN podem ser vinculados a empresas.');
    }

    return this.prisma.empresaUsuario.upsert({
      where: { userId_empresaId: { userId, empresaId: id } },
      create: { userId, empresaId: id },
      update: {},
      include: { user: true, empresa: true },
    });
  }

  async desvincularUsuario(id: number, userId: number) {
    await this.findOne(id);

    const result = await this.prisma.empresaUsuario.deleteMany({
      where: { userId, empresaId: id },
    });
    if (result.count === 0) throw new NotFoundException('Vínculo não encontrado');

    return { deleted: true };
  }
}
