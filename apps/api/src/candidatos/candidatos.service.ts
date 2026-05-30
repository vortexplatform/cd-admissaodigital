import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidatoDto } from './dto/create-candidato.dto';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';

const candidatoInclude = {
  requisicoes: {
    include: { empresa: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.CandidatoInclude;

const cleanString = (value?: string) => value?.trim() || undefined;

const normalizeCpf = (value?: string) => value?.replace(/\D/g, '') || undefined;

const buildCandidatoData = (dto: CreateCandidatoDto | UpdateCandidatoDto) => ({
  cpf: normalizeCpf(dto.cpf),
  dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
  nome: cleanString(dto.nome),
  email: cleanString(dto.email),
  telefone: cleanString(dto.telefone),
});

@Injectable()
export class CandidatosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCandidatoDto) {
    try {
      return await this.prisma.candidato.create({
        data: buildCandidatoData(dto) as Prisma.CandidatoCreateInput,
        include: candidatoInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  findAll() {
    return this.prisma.candidato.findMany({
      include: candidatoInclude,
      orderBy: [{ nome: 'asc' }, { cpf: 'asc' }],
    });
  }

  async findOne(id: number) {
    const candidato = await this.prisma.candidato.findUnique({
      where: { id },
      include: candidatoInclude,
    });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    return candidato;
  }

  async update(id: number, dto: UpdateCandidatoDto) {
    await this.findOne(id);

    try {
      return await this.prisma.candidato.update({
        where: { id },
        data: buildCandidatoData(dto),
        include: candidatoInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    const candidato = await this.findOne(id);
    if (candidato.requisicoes.length > 0) {
      throw new BadRequestException('Não é possível excluir candidato vinculado a uma requisição.');
    }

    await this.prisma.candidato.delete({ where: { id } });

    return { deleted: true };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Já existe um candidato com estes dados.');
    }

    throw error;
  }
}
