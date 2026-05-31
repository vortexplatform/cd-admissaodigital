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
  candidaturas: {
    include: {
      requisicao: {
        include: { empresa: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.CandidatoInclude;

const cleanString = (value?: string) => value?.trim() || undefined;

const normalizeCpf = (value?: string) => value?.replace(/\D/g, '') || undefined;

const normalizeSearchTerm = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

const clampSearchLimit = (value?: string) => {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 20;

  return Math.min(Math.max(Math.trunc(limit), 1), 50);
};

const normalizePage = (value?: string) => {
  const page = Number(value);
  if (!Number.isFinite(page)) return 1;

  return Math.max(Math.trunc(page), 1);
};

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

  async findPaginated({ nome, page, limit }: { nome?: string; page?: string; limit?: string }) {
    const term = normalizeSearchTerm(nome);
    const currentPage = normalizePage(page);
    const pageSize = clampSearchLimit(limit);

    if (term && term.length < 3) {
      return this.buildPaginatedResponse([], 0, currentPage, pageSize);
    }

    if (term) return this.findPaginatedByNome(term, currentPage, pageSize);

    const [data, total] = await Promise.all([
      this.prisma.candidato.findMany({
        include: candidatoInclude,
        orderBy: [{ nome: 'asc' }, { cpf: 'asc' }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.candidato.count(),
    ]);

    return this.buildPaginatedResponse(data, total, currentPage, pageSize);
  }

  async searchByNome(nome?: string, limit?: string) {
    const term = normalizeSearchTerm(nome);
    if (term.length < 3) return [];

    try {
      return await this.prisma.$queryRaw<
        Array<{
          id: number;
          nome: string | null;
          cpf: string;
          email: string | null;
          telefone: string | null;
        }>
      >(Prisma.sql`
        SELECT "id", "nome", "cpf", "email", "telefone"
        FROM "candidato"
        WHERE "nome" IS NOT NULL
          AND public.immutable_unaccent(lower("nome")) LIKE public.immutable_unaccent(lower(${`%${term}%`}))
        ORDER BY "nome" ASC, "cpf" ASC
        LIMIT ${clampSearchLimit(limit)}
      `);
    } catch (error) {
      if (!this.isMissingUnaccentPreparation(error)) throw error;

      return this.prisma.candidato.findMany({
        select: { id: true, nome: true, cpf: true, email: true, telefone: true },
        where: { nome: { contains: term, mode: 'insensitive' } },
        orderBy: [{ nome: 'asc' }, { cpf: 'asc' }],
        take: clampSearchLimit(limit),
      });
    }
  }

  private async findPaginatedByNome(term: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    try {
      const [idRows, totalRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          SELECT "id"
          FROM "candidato"
          WHERE "nome" IS NOT NULL
            AND public.immutable_unaccent(lower("nome")) LIKE public.immutable_unaccent(lower(${`%${term}%`}))
          ORDER BY "nome" ASC, "cpf" ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS "total"
          FROM "candidato"
          WHERE "nome" IS NOT NULL
            AND public.immutable_unaccent(lower("nome")) LIKE public.immutable_unaccent(lower(${`%${term}%`}))
        `),
      ]);

      const data = await this.findCandidatesByOrderedIds(idRows.map((row) => row.id));
      return this.buildPaginatedResponse(data, totalRows[0]?.total ?? 0, page, limit);
    } catch (error) {
      if (!this.isMissingUnaccentPreparation(error)) throw error;

      const where = { nome: { contains: term, mode: 'insensitive' as const } };
      const [data, total] = await Promise.all([
        this.prisma.candidato.findMany({
          where,
          include: candidatoInclude,
          orderBy: [{ nome: 'asc' }, { cpf: 'asc' }],
          skip: offset,
          take: limit,
        }),
        this.prisma.candidato.count({ where }),
      ]);

      return this.buildPaginatedResponse(data, total, page, limit);
    }
  }

  private async findCandidatesByOrderedIds(ids: number[]) {
    if (ids.length === 0) return [];

    const candidates = await this.prisma.candidato.findMany({
      where: { id: { in: ids } },
      include: candidatoInclude,
    });
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

    return ids.flatMap((id) => {
      const candidate = candidatesById.get(id);
      return candidate ? [candidate] : [];
    });
  }

  private buildPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
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
    if (candidato.candidaturas.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir candidato com candidaturas vinculadas.',
      );
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

  private isMissingUnaccentPreparation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2010' &&
      String(error.meta?.message ?? '').includes('immutable_unaccent')
    );
  }
}
