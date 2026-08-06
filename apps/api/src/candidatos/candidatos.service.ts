import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCandidatura } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCandidatoDependenteDto } from './dto/create-candidato-dependente.dto';
import { CreateCandidatoEtapaDto } from './dto/create-candidato-etapa.dto';
import { CreateCandidatoValeTransporteDto } from './dto/create-candidato-vale-transporte.dto';
import { CreateCandidatoDto } from './dto/create-candidato.dto';
import { UpdateCandidatoDependenteDto } from './dto/update-candidato-dependente.dto';
import { UpdateCandidatoEtapaDto } from './dto/update-candidato-etapa.dto';
import { UpdateCandidatoValeTransporteDto } from './dto/update-candidato-vale-transporte.dto';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';

const candidatoInclude = {
  cidadeVaga: true,
  candidaturas: {
    include: {
      requisicao: {
        include: { empresa: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  dependentes: {
    orderBy: { nome: 'asc' },
  },
  valeTransportes: {
    orderBy: { id: 'asc' },
  },
  etapas: {
    orderBy: { sequencia: 'asc' },
  },
} satisfies Prisma.CandidatoInclude;

const cleanString = (value?: string) => value?.trim() || undefined;

const normalizeCpf = (value?: string) => value?.replace(/\D/g, '') || undefined;

const normalizePis = (value?: string) => value?.replace(/\D/g, '') || undefined;

const normalizeCep = (value?: string) => value?.replace(/\D/g, '') || undefined;

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

type CandidatoTabKey = 'aguardando' | 'em-analise' | 'aprovados' | 'efetivados' | 'recusados';

const candidatoTabKeys = new Set<CandidatoTabKey>([
  'aguardando',
  'em-analise',
  'aprovados',
  'efetivados',
  'recusados',
]);

// Espelha a classificação de aba usada em apps/web (CandidatosPage.tsx) para que os
// badges reflitam a mesma regra aplicada à candidatura mais recente do candidato.
const getTabForStatus = (status?: StatusCandidatura): CandidatoTabKey => {
  if (!status || status === StatusCandidatura.INSCRITO) return 'aguardando';
  if (status === StatusCandidatura.APROVADO) return 'aprovados';
  if (status === StatusCandidatura.EFETIVADO) return 'efetivados';
  if (
    status === StatusCandidatura.REPROVADO ||
    status === StatusCandidatura.CANCELADO ||
    status === StatusCandidatura.DESISTIU
  )
    return 'recusados';
  return 'em-analise';
};

const normalizeTab = (value?: string): CandidatoTabKey | undefined =>
  candidatoTabKeys.has(value as CandidatoTabKey) ? (value as CandidatoTabKey) : undefined;

const normalizeFilial = (value?: string) => {
  const filial = Number(value);
  return Number.isInteger(filial) && filial >= 0 ? filial : undefined;
};

const normalizePositiveId = (value?: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const buildDependenteData = (dto: CreateCandidatoDependenteDto | UpdateCandidatoDependenteDto) => ({
  nome: cleanString(dto.nome),
  codigoGrauParentesco: cleanString(dto.codigoGrauParentesco),
  descricaoGrauParentesco: cleanString(dto.descricaoGrauParentesco),
  codigoTipoEsocial: dto.codigoTipoEsocial,
  descricaoTipoEsocial: cleanString(dto.descricaoTipoEsocial),
  sexo: cleanString(dto.sexo),
  dependenteIr: dto.dependenteIr,
  dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
  cpf: normalizeCpf(dto.cpf) ?? '',
});

const buildValeTransporteData = (
  dto: CreateCandidatoValeTransporteDto | UpdateCandidatoValeTransporteDto,
) => ({
  tipoTransporte: cleanString(dto.tipoTransporte),
  tipoTrajeto: cleanString(dto.tipoTrajeto),
  transporteUsado: cleanString(dto.transporteUsado),
  tarifaUnitaria: dto.tarifaUnitaria,
  valesPorDia: dto.valesPorDia,
});

const buildEtapaData = (dto: CreateCandidatoEtapaDto | UpdateCandidatoEtapaDto) => ({
  codigoEtapa: dto.codigoEtapa,
  descricaoEtapa: cleanString(dto.descricaoEtapa),
  data: dto.data ? new Date(dto.data) : undefined,
  sequencia: dto.sequencia,
  observacao: cleanString(dto.observacao),
});

const exigeJustificativaReprovacao = (situacao?: string) =>
  situacao === 'ELIMINADO' || situacao === 'DESISTENTE';

const validateSituacaoCandidato = (dto: CreateCandidatoDto | UpdateCandidatoDto) => {
  if (exigeJustificativaReprovacao(dto.situacao) && !cleanString(dto.justificativaReprovacao)) {
    throw new BadRequestException('Informe a justificativa para candidato eliminado ou desistente.');
  }
};

const buildCandidatoData = (dto: CreateCandidatoDto | UpdateCandidatoDto) => ({
  cpf: normalizeCpf(dto.cpf),
  dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
  nome: cleanString(dto.nome),
  email: cleanString(dto.email),
  telefone: cleanString(dto.telefone),
  genero: cleanString(dto.genero),
  situacao: cleanString(dto.situacao),
  justificativaReprovacao: cleanString(dto.justificativaReprovacao),
  possuiFilhos: dto.possuiFilhos,
  cidadeVagaId: dto.cidadeVagaId,

  // Admissão
  tipoAdmissao: cleanString(dto.tipoAdmissao),

  // Dados pessoais adicionais
  estadoCivil: cleanString(dto.estadoCivil),
  grauInstrucao: cleanString(dto.grauInstrucao),
  pis: normalizePis(dto.pis),
  raccor: dto.raccor,

  // Naturalidade
  nacionalidade: dto.nacionalidade,
  paisNascimento: cleanString(dto.paisNascimento),
  estadoNascimento: cleanString(dto.estadoNascimento),
  cidadeNascimentoCod: dto.cidadeNascimentoCod,
  cidadeNascimentoNome: cleanString(dto.cidadeNascimentoNome),

  // Endereço
  pais: cleanString(dto.pais),
  cep: normalizeCep(dto.cep),
  estadoEndereco: cleanString(dto.estadoEndereco),
  cidadeCod: dto.cidadeCod,
  cidadeNome: cleanString(dto.cidadeNome),
  bairroCod: dto.bairroCod,
  bairroNome: cleanString(dto.bairroNome),
  tipoLogradouro: cleanString(dto.tipoLogradouro),
  endereco: cleanString(dto.endereco),
  numero: cleanString(dto.numero),
  complemento: cleanString(dto.complemento),

  // Contatos
  ddiTelefone: cleanString(dto.ddiTelefone),
  dddTelefone: cleanString(dto.dddTelefone),
  numeroTelefone: cleanString(dto.numeroTelefone),
  ddiTelefone2: cleanString(dto.ddiTelefone2),
  dddTelefone2: cleanString(dto.dddTelefone2),
  numeroTelefone2: cleanString(dto.numeroTelefone2),

  // RG
  numeroRg: cleanString(dto.numeroRg),
  orgaoEmissorRg: cleanString(dto.orgaoEmissorRg),
  dataExpedicaoRg: dto.dataExpedicaoRg ? new Date(dto.dataExpedicaoRg) : undefined,

  // Título de eleitor
  numeroTituloEleitor: cleanString(dto.numeroTituloEleitor),
  zonaTituloEleitor: cleanString(dto.zonaTituloEleitor),
  secaoTituloEleitor: cleanString(dto.secaoTituloEleitor),

  // Reservista
  numeroCertReservista: cleanString(dto.numeroCertReservista),

  // Certidão civil
  tipoCertidaoCivil: cleanString(dto.tipoCertidaoCivil),
  dataEmissaoCertidaoCivil: dto.dataEmissaoCertidaoCivil
    ? new Date(dto.dataEmissaoCertidaoCivil)
    : undefined,
  matriculaCertidaoCivil: cleanString(dto.matriculaCertidaoCivil),
  termoMatriculaCertidao: cleanString(dto.termoMatriculaCertidao),
  livroCertidaoCivil: cleanString(dto.livroCertidaoCivil),
  folhaCertidaoCivil: cleanString(dto.folhaCertidaoCivil),
  estadoCertidaoCivil: cleanString(dto.estadoCertidaoCivil),
  cidadeCertidaoCivilCod: dto.cidadeCertidaoCivilCod,
  cidadeCertidaoCivilNome: cleanString(dto.cidadeCertidaoCivilNome),

  // Uniforme
  tamanhoCamisa: cleanString(dto.tamanhoCamisa),
  tamanhoCalca: cleanString(dto.tamanhoCalca),
  tamanhoCalcado: cleanString(dto.tamanhoCalcado),

  // Responsável legal
  responsavelNome: cleanString(dto.responsavelNome),
  responsavelCpf: normalizeCpf(dto.responsavelCpf),
  responsavelEmail: cleanString(dto.responsavelEmail),
  responsavelTelefone: cleanString(dto.responsavelTelefone),
});

@Injectable()
export class CandidatosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(dto: CreateCandidatoDto) {
    validateSituacaoCandidato(dto);
    await this.ensureCidadeVagaExists(dto.cidadeVagaId);

    try {
      const { dependentes, valeTransportes, etapas } = dto;
      const candidato = await this.prisma.candidato.create({
        data: {
          ...(buildCandidatoData(dto) as Prisma.CandidatoUncheckedCreateInput),
          dependentes: dependentes?.length
            ? {
                create: dependentes.map((dependente) =>
                  buildDependenteData(dependente) as Prisma.CandidatoDependenteCreateWithoutCandidatoInput,
                ),
              }
            : undefined,
          valeTransportes: valeTransportes?.length
            ? {
                create: valeTransportes.map((valeTransporte) =>
                  buildValeTransporteData(
                    valeTransporte,
                  ) as Prisma.CandidatoValeTransporteCreateWithoutCandidatoInput,
                ),
              }
            : undefined,
          etapas: etapas?.length
            ? {
                create: etapas.map(
                  (etapa) => buildEtapaData(etapa) as Prisma.CandidatoEtapaCreateWithoutCandidatoInput,
                ),
              }
            : undefined,
        },
        include: candidatoInclude,
      });
      await this.linkUserByCpf(candidato.cpf);
      return this.findOne(candidato.id);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findPaginated({
    nome,
    page,
    limit,
    situacao,
    filial,
    cidadeVagaId,
  }: {
    nome?: string;
    page?: string;
    limit?: string;
    situacao?: string;
    filial?: string;
    cidadeVagaId?: string;
  }) {
    const term = normalizeSearchTerm(nome);
    const currentPage = normalizePage(page);
    const pageSize = clampSearchLimit(limit);
    const tab = normalizeTab(situacao);
    const filialNumero = normalizeFilial(filial);
    const cidadeVagaNumero = normalizePositiveId(cidadeVagaId);

    if (term && term.length < 3) {
      return this.buildPaginatedResponse([], 0, currentPage, pageSize);
    }

    return this.findPaginatedFiltered(term, currentPage, pageSize, tab, filialNumero, cidadeVagaNumero);
  }

  async countByTab(nome?: string, filial?: string, cidadeVagaId?: string) {
    const counts: Record<'todos' | CandidatoTabKey, number> = {
      todos: 0,
      aguardando: 0,
      'em-analise': 0,
      aprovados: 0,
      efetivados: 0,
      recusados: 0,
    };

    const term = normalizeSearchTerm(nome);
    if (term && term.length < 3) return counts;

    const candidates = await this.findFilteredCandidateStatuses(
      term,
      normalizeFilial(filial),
      normalizePositiveId(cidadeVagaId),
    );
    counts.todos = candidates.length;
    for (const candidate of candidates) {
      counts[getTabForStatus(candidate.status ?? undefined)] += 1;
    }

    return counts;
  }

  async findFiliais() {
    const filiais = await this.prisma.requisicaoVaga.findMany({
      where: { filial: { not: null }, candidaturas: { some: {} } },
      select: { filial: true, filialNome: true },
      distinct: ['filial', 'filialNome'],
      orderBy: [{ filial: 'asc' }, { filialNome: 'asc' }],
    });

    return filiais.map((filial) => ({ numero: filial.filial!, nome: filial.filialNome }));
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

  private buildCandidateListFilters(
    term: string,
    filial?: number,
    situacao?: CandidatoTabKey,
    cidadeVagaId?: number,
    useUnaccent = true,
  ) {
    const filters = [Prisma.sql`TRUE`];

    if (term) {
      filters.push(
        useUnaccent
          ? Prisma.sql`c."nome" IS NOT NULL AND public.immutable_unaccent(lower(c."nome")) LIKE public.immutable_unaccent(lower(${`%${term}%`}))`
          : Prisma.sql`c."nome" IS NOT NULL AND lower(c."nome") LIKE lower(${`%${term}%`})`,
      );
    }
    if (filial !== undefined) filters.push(Prisma.sql`r."filial" = ${filial}`);
    if (cidadeVagaId !== undefined) filters.push(Prisma.sql`c."cidade_vaga_id" = ${cidadeVagaId}`);

    if (situacao) {
      const tab = Prisma.sql`
        CASE
          WHEN latest."status" IS NULL OR latest."status" = 'INSCRITO' THEN 'aguardando'
          WHEN latest."status" = 'APROVADO' THEN 'aprovados'
          WHEN latest."status" = 'EFETIVADO' THEN 'efetivados'
          WHEN latest."status" IN ('REPROVADO', 'CANCELADO', 'DESISTIU') THEN 'recusados'
          ELSE 'em-analise'
        END
      `;
      filters.push(Prisma.sql`${tab} = ${situacao}`);
    }

    return Prisma.join(filters, ' AND ');
  }

  private async findPaginatedFiltered(
    term: string,
    page: number,
    limit: number,
    situacao?: CandidatoTabKey,
    filial?: number,
    cidadeVagaId?: number,
  ) {
    const query = async (useUnaccent: boolean) => {
      const where = this.buildCandidateListFilters(term, filial, situacao, cidadeVagaId, useUnaccent);
      const offset = (page - 1) * limit;
      const [idRows, totalRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          WITH latest AS (
            SELECT DISTINCT ON ("candidato_id") "candidato_id", "requisicao_id", "status"
            FROM "candidatura"
            ORDER BY "candidato_id", "created_at" DESC, "id" DESC
          )
          SELECT c."id"
          FROM "candidato" c
          LEFT JOIN latest ON latest."candidato_id" = c."id"
          LEFT JOIN "requisicao_vaga" r ON r."id" = latest."requisicao_id"
          WHERE ${where}
          ORDER BY c."nome" ASC NULLS LAST, c."cpf" ASC
          LIMIT ${limit} OFFSET ${offset}
        `),
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          WITH latest AS (
            SELECT DISTINCT ON ("candidato_id") "candidato_id", "requisicao_id", "status"
            FROM "candidatura"
            ORDER BY "candidato_id", "created_at" DESC, "id" DESC
          )
          SELECT COUNT(*)::int AS "total"
          FROM "candidato" c
          LEFT JOIN latest ON latest."candidato_id" = c."id"
          LEFT JOIN "requisicao_vaga" r ON r."id" = latest."requisicao_id"
          WHERE ${where}
        `),
      ]);
      const data = await this.findCandidatesByOrderedIds(idRows.map((row) => row.id));
      return this.buildPaginatedResponse(data, totalRows[0]?.total ?? 0, page, limit);
    };

    try {
      return await query(true);
    } catch (error) {
      if (!term || !this.isMissingUnaccentPreparation(error)) throw error;
      return query(false);
    }
  }

  private async findFilteredCandidateStatuses(term: string, filial?: number, cidadeVagaId?: number) {
    const query = (useUnaccent: boolean) => {
      const where = this.buildCandidateListFilters(term, filial, undefined, cidadeVagaId, useUnaccent);
      return this.prisma.$queryRaw<Array<{ status: StatusCandidatura | null }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("candidato_id") "candidato_id", "requisicao_id", "status"
          FROM "candidatura"
          ORDER BY "candidato_id", "created_at" DESC, "id" DESC
        )
        SELECT latest."status"
        FROM "candidato" c
        LEFT JOIN latest ON latest."candidato_id" = c."id"
        LEFT JOIN "requisicao_vaga" r ON r."id" = latest."requisicao_id"
        WHERE ${where}
      `);
    };

    try {
      return await query(true);
    } catch (error) {
      if (!term || !this.isMissingUnaccentPreparation(error)) throw error;
      return query(false);
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
    const candidato = await this.findOne(id);
    validateSituacaoCandidato(dto);
    if (dto.cidadeVagaId !== undefined) await this.ensureCidadeVagaExists(dto.cidadeVagaId);

    const cpf = normalizeCpf(dto.cpf);
    if (cpf && cpf !== candidato.cpf) throw new BadRequestException('CPF não pode ser alterado.');

    try {
      const data = buildCandidatoData({ ...dto, cpf: undefined });
      return await this.prisma.candidato.update({
        where: { id },
        data,
        include: candidatoInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async createDependente(candidatoId: number, dto: CreateCandidatoDependenteDto) {
    await this.ensureCandidatoExists(candidatoId);

    return this.prisma.candidatoDependente.create({
      data: {
        ...(buildDependenteData(dto) as Prisma.CandidatoDependenteUncheckedCreateInput),
        candidatoId,
      },
    });
  }

  async updateDependente(candidatoId: number, dependenteId: number, dto: UpdateCandidatoDependenteDto) {
    await this.ensureDependenteBelongsToCandidato(candidatoId, dependenteId);

    return this.prisma.candidatoDependente.update({
      where: { id: dependenteId },
      data: buildDependenteData(dto),
    });
  }

  async removeDependente(candidatoId: number, dependenteId: number) {
    await this.ensureDependenteBelongsToCandidato(candidatoId, dependenteId);
    await this.prisma.candidatoDependente.delete({ where: { id: dependenteId } });

    return { deleted: true };
  }

  async createValeTransporte(candidatoId: number, dto: CreateCandidatoValeTransporteDto) {
    await this.ensureCandidatoExists(candidatoId);

    return this.prisma.candidatoValeTransporte.create({
      data: {
        ...(buildValeTransporteData(dto) as Prisma.CandidatoValeTransporteUncheckedCreateInput),
        candidatoId,
      },
    });
  }

  async updateValeTransporte(
    candidatoId: number,
    valeTransporteId: number,
    dto: UpdateCandidatoValeTransporteDto,
  ) {
    await this.ensureValeTransporteBelongsToCandidato(candidatoId, valeTransporteId);

    return this.prisma.candidatoValeTransporte.update({
      where: { id: valeTransporteId },
      data: buildValeTransporteData(dto),
    });
  }

  async removeValeTransporte(candidatoId: number, valeTransporteId: number) {
    await this.ensureValeTransporteBelongsToCandidato(candidatoId, valeTransporteId);
    await this.prisma.candidatoValeTransporte.delete({ where: { id: valeTransporteId } });

    return { deleted: true };
  }

  async createEtapa(candidatoId: number, dto: CreateCandidatoEtapaDto) {
    await this.ensureCandidatoExists(candidatoId);

    try {
      return await this.prisma.candidatoEtapa.create({
        data: {
          ...(buildEtapaData(dto) as Prisma.CandidatoEtapaUncheckedCreateInput),
          candidatoId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta etapa já foi adicionada para este candidato.');
      }
      throw error;
    }
  }

  async updateEtapa(candidatoId: number, etapaId: number, dto: UpdateCandidatoEtapaDto) {
    await this.ensureEtapaBelongsToCandidato(candidatoId, etapaId);

    try {
      return await this.prisma.candidatoEtapa.update({
        where: { id: etapaId },
        data: buildEtapaData(dto),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta etapa já foi adicionada para este candidato.');
      }
      throw error;
    }
  }

  async removeEtapa(candidatoId: number, etapaId: number) {
    await this.ensureEtapaBelongsToCandidato(candidatoId, etapaId);
    await this.prisma.candidatoEtapa.delete({ where: { id: etapaId } });

    return { deleted: true };
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

  private async ensureCandidatoExists(id: number) {
    const candidato = await this.prisma.candidato.findUnique({ where: { id }, select: { id: true } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');
  }

  private async ensureCidadeVagaExists(id: number) {
    const cidade = await this.prisma.cidadeVaga.findUnique({ where: { id }, select: { id: true } });
    if (!cidade) throw new BadRequestException('Cidade da vaga inválida.');
  }

  private async ensureDependenteBelongsToCandidato(candidatoId: number, dependenteId: number) {
    const dependente = await this.prisma.candidatoDependente.findFirst({
      where: { id: dependenteId, candidatoId },
      select: { id: true },
    });
    if (!dependente) throw new NotFoundException('Dependente não encontrado');
  }

  private async ensureValeTransporteBelongsToCandidato(
    candidatoId: number,
    valeTransporteId: number,
  ) {
    const valeTransporte = await this.prisma.candidatoValeTransporte.findFirst({
      where: { id: valeTransporteId, candidatoId },
      select: { id: true },
    });
    if (!valeTransporte) throw new NotFoundException('Vale transporte não encontrado');
  }

  private async ensureEtapaBelongsToCandidato(candidatoId: number, etapaId: number) {
    const etapa = await this.prisma.candidatoEtapa.findFirst({
      where: { id: etapaId, candidatoId },
      select: { id: true },
    });
    if (!etapa) throw new NotFoundException('Etapa não encontrada');
  }

  private async linkUserByCpf(cpf: string) {
    const user = await this.prisma.user.findUnique({ where: { cpf } });
    if (!user) return;

    await this.users.linkCandidatoByCpf(user.id, cpf);
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
