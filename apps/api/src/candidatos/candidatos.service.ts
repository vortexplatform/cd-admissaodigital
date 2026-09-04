import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../auth/email.service';
import { GeneralService } from '../general/general.service';
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
import {
  PublicCandidatoDto,
  PublicCandidatoUpdateDto,
  PublicDadosVagaDto,
  PublicExperienciaDto,
} from './dto/public-candidato.dto';

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

const cleanNullableString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  return value?.trim() || null;
};

const normalizeCpf = (value?: string) => value?.replace(/\D/g, '') || undefined;

const normalizeNullableDigits = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  return value?.replace(/\D/g, '') || null;
};

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
    throw new BadRequestException(
      'Informe a justificativa para candidato eliminado ou desistente.',
    );
  }
};

const cleanDate = (value?: string | null): Date | null | undefined => {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
};

const buildCandidatoData = (dto: CreateCandidatoDto | UpdateCandidatoDto) => ({
  cpf: normalizeCpf(dto.cpf),
  dataNascimento: cleanDate(dto.dataNascimento),
  nome: cleanNullableString(dto.nome),
  email: cleanNullableString(dto.email),
  telefone: cleanNullableString(dto.telefone),
  genero: cleanNullableString(dto.genero),
  situacao: cleanString(dto.situacao),
  justificativaReprovacao: cleanNullableString(dto.justificativaReprovacao),
  possuiFilhos: dto.possuiFilhos,
  cidadeVagaId: dto.cidadeVagaId,

  // Admissão
  tipoAdmissao: cleanNullableString(dto.tipoAdmissao),

  // Dados pessoais adicionais
  estadoCivil: cleanNullableString(dto.estadoCivil),
  grauInstrucao: cleanNullableString(dto.grauInstrucao),
  pis: normalizeNullableDigits(dto.pis),
  raccor: dto.raccor,

  // Naturalidade
  nacionalidade: dto.nacionalidade,
  paisNascimento: cleanNullableString(dto.paisNascimento),
  estadoNascimento: cleanNullableString(dto.estadoNascimento),
  cidadeNascimentoCod: dto.cidadeNascimentoCod,
  cidadeNascimentoNome: cleanNullableString(dto.cidadeNascimentoNome),

  // Endereço
  pais: cleanNullableString(dto.pais),
  cep: normalizeNullableDigits(dto.cep),
  estadoEndereco: cleanNullableString(dto.estadoEndereco),
  cidadeCod: dto.cidadeCod,
  cidadeNome: cleanNullableString(dto.cidadeNome),
  bairroCod: dto.bairroCod,
  bairroNome: cleanNullableString(dto.bairroNome),
  tipoLogradouro: cleanNullableString(dto.tipoLogradouro),
  endereco: cleanNullableString(dto.endereco),
  numero: cleanNullableString(dto.numero),
  complemento: cleanNullableString(dto.complemento),

  // Contatos
  ddiTelefone: cleanNullableString(dto.ddiTelefone),
  dddTelefone: cleanNullableString(dto.dddTelefone),
  numeroTelefone: cleanNullableString(dto.numeroTelefone),
  ddiTelefone2: cleanNullableString(dto.ddiTelefone2),
  dddTelefone2: cleanNullableString(dto.dddTelefone2),
  numeroTelefone2: cleanNullableString(dto.numeroTelefone2),

  // RG
  numeroRg: cleanNullableString(dto.numeroRg),
  orgaoEmissorRg: cleanNullableString(dto.orgaoEmissorRg),
  dataExpedicaoRg: cleanDate(dto.dataExpedicaoRg),

  // Título de eleitor
  numeroTituloEleitor: cleanNullableString(dto.numeroTituloEleitor),
  zonaTituloEleitor: cleanNullableString(dto.zonaTituloEleitor),
  secaoTituloEleitor: cleanNullableString(dto.secaoTituloEleitor),

  // Reservista
  numeroCertReservista: cleanNullableString(dto.numeroCertReservista),

  // Certidão civil
  tipoCertidaoCivil: cleanNullableString(dto.tipoCertidaoCivil),
  dataEmissaoCertidaoCivil: cleanDate(dto.dataEmissaoCertidaoCivil),
  matriculaCertidaoCivil: cleanNullableString(dto.matriculaCertidaoCivil),
  termoMatriculaCertidao: cleanNullableString(dto.termoMatriculaCertidao),
  livroCertidaoCivil: cleanNullableString(dto.livroCertidaoCivil),
  folhaCertidaoCivil: cleanNullableString(dto.folhaCertidaoCivil),
  estadoCertidaoCivil: cleanNullableString(dto.estadoCertidaoCivil),
  cidadeCertidaoCivilCod: dto.cidadeCertidaoCivilCod,
  cidadeCertidaoCivilNome: cleanNullableString(dto.cidadeCertidaoCivilNome),

  // Uniforme
  tamanhoCamisa: cleanNullableString(dto.tamanhoCamisa),
  tamanhoCalca: cleanNullableString(dto.tamanhoCalca),
  tamanhoCalcado: cleanNullableString(dto.tamanhoCalcado),

  // Responsável legal
  responsavelNome: cleanNullableString(dto.responsavelNome),
  responsavelCpf: normalizeNullableDigits(dto.responsavelCpf),
  responsavelEmail: cleanNullableString(dto.responsavelEmail),
  responsavelTelefone: cleanNullableString(dto.responsavelTelefone),
});

const buildPublicDadosVagaData = (dto: PublicDadosVagaDto) => ({
  bairro: cleanString(dto.bairro) ?? '',
  estudoHorario: cleanNullableString(dto.estudoHorario),
  disponibilidadeHorario: dto.disponibilidadeHorario,
  nomePai: cleanNullableString(dto.nomePai),
  nomeMae: cleanNullableString(dto.nomeMae),
  indicadoFuncionario: dto.indicadoFuncionario,
  indicadoLojaSetor: cleanNullableString(dto.indicadoLojaSetor),
  parenteEmpresa: dto.parenteEmpresa,
  parenteNome: cleanNullableString(dto.parenteNome),
  parenteLojaSetor: cleanNullableString(dto.parenteLojaSetor),
  aposentado: dto.aposentado,
  aposentadoriaTipo: cleanNullableString(dto.aposentadoriaTipo),
  conducaoPropria: cleanNullableString(dto.conducaoPropria),
});

const buildPublicExperiencias = (experiencias: PublicExperienciaDto[]) =>
  experiencias.map((experiencia, index) => ({
    id: index + 1,
    empresa: cleanString(experiencia.empresa) ?? '',
    cargo: cleanString(experiencia.cargo) ?? '',
    admissao: cleanDate(experiencia.admissao),
    demissao: cleanDate(experiencia.demissao),
    motivoSaida: cleanNullableString(experiencia.motivoSaida),
  }));

const grauInstrucaoLabels: Record<string, string> = {
  '01': 'Analfabeto',
  '02': '1ª a 4ª Série',
  '03': '4ª Série Completa',
  '04': 'Ensino Fundamental Incompleto',
  '05': 'Ensino Fundamental Completo',
  '06': 'Ensino Médio Incompleto',
  '07': 'Ensino Médio Completo',
  '08': 'Superior Incompleto',
  '09': 'Superior Completo',
  '10': 'Pós-Graduação',
  '11': 'Mestrado',
  '12': 'Doutorado',
};

const tipoLogradouroLabels: Record<string, string> = {
  AV: 'Avenida',
  R: 'Rua',
  PC: 'Praça',
  ROD: 'Rodovia',
  VLA: 'Vila',
  COND: 'Condomínio',
  SIT: 'Sítio',
  BL: 'Bloco',
  O: 'Outros',
};

const calculateAge = (date: Date) => {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age.toString();
};

@Injectable()
export class CandidatosService {
  private readonly logger = new Logger(CandidatosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly email: EmailService,
    private readonly general: GeneralService,
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
                create: dependentes.map(
                  (dependente) =>
                    buildDependenteData(
                      dependente,
                    ) as Prisma.CandidatoDependenteCreateWithoutCandidatoInput,
                ),
              }
            : undefined,
          valeTransportes: valeTransportes?.length
            ? {
                create: valeTransportes.map(
                  (valeTransporte) =>
                    buildValeTransporteData(
                      valeTransporte,
                    ) as Prisma.CandidatoValeTransporteCreateWithoutCandidatoInput,
                ),
              }
            : undefined,
          etapas: etapas?.length
            ? {
                create: etapas.map(
                  (etapa) =>
                    buildEtapaData(etapa) as Prisma.CandidatoEtapaCreateWithoutCandidatoInput,
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

    return this.findPaginatedFiltered(
      term,
      currentPage,
      pageSize,
      tab,
      filialNumero,
      cidadeVagaNumero,
    );
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

  async findByCpf(cpf?: string) {
    const normalizedCpf = normalizeCpf(cpf);
    if (!normalizedCpf || normalizedCpf.length !== 11) return null;

    return this.prisma.candidato.findUnique({
      where: { cpf: normalizedCpf },
      select: { cpf: true, nome: true },
    });
  }

  async findPublicByCpf(cpf?: string) {
    const normalizedCpf = normalizeCpf(cpf);
    if (!normalizedCpf || normalizedCpf.length !== 11) return null;

    return this.prisma.candidato.findUnique({
      where: { cpf: normalizedCpf },
      select: {
        id: true,
        cpf: true,
        cidadeVagaId: true,
        nome: true,
        email: true,
        telefone: true,
        dddTelefone: true,
        numeroTelefone: true,
        dataNascimento: true,
        estadoCivil: true,
        raccor: true,
        grauInstrucao: true,
        cep: true,
        estadoEndereco: true,
        cidadeCod: true,
        cidadeNome: true,
        bairroCod: true,
        bairroNome: true,
        tipoLogradouro: true,
        endereco: true,
        numero: true,
        complemento: true,
        dadosVaga: true,
        lojasProximas: { orderBy: { codfil: 'asc' } },
        experiencias: { orderBy: { id: 'asc' } },
      },
    });
  }

  findPublicCities() {
    return this.prisma.cidadeVaga.findMany({ orderBy: { nome: 'asc' } });
  }

  async findPublicCity(id: number) {
    const cidade = await this.prisma.cidadeVaga.findUnique({ where: { id } });
    if (!cidade) throw new NotFoundException('Cidade da vaga não encontrada');
    return cidade;
  }

  async savePublic(dto: PublicCandidatoDto) {
    await this.ensureCidadeVagaExists(dto.cidadeVagaId);

    try {
      const candidato = await this.prisma.candidato.create({
        data: {
          ...(buildCandidatoData({
            ...dto,
            situacao: 'CANDIDATO',
            possuiFilhos: false,
          }) as Prisma.CandidatoUncheckedCreateInput),
          dadosVaga: { create: buildPublicDadosVagaData(dto.dadosVaga) },
          lojasProximas: { create: dto.lojasProximas.map(({ codfil }) => ({ codfil })) },
          experiencias: { create: buildPublicExperiencias(dto.experiencias) },
        },
        include: candidatoInclude,
      });
      await this.linkUserByCpf(candidato.cpf);
      await this.notifyPublicCandidatura(dto.cpf, dto);
      return candidato;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updatePublic(dto: PublicCandidatoUpdateDto) {
    const candidato = await this.prisma.candidato.findUnique({
      where: { cpf: normalizeCpf(dto.cpf) },
      select: { id: true },
    });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    const endereco = dto.atualizarEndereco
      ? {
          cep: normalizeNullableDigits(dto.cep),
          estadoEndereco: cleanNullableString(dto.estadoEndereco),
          cidadeCod: dto.cidadeCod,
          cidadeNome: cleanNullableString(dto.cidadeNome),
          bairroCod: dto.bairroCod,
          bairroNome: cleanNullableString(dto.bairroNome),
          tipoLogradouro: cleanNullableString(dto.tipoLogradouro),
          endereco: cleanNullableString(dto.endereco),
          numero: cleanNullableString(dto.numero),
          complemento: cleanNullableString(dto.complemento),
        }
      : {};

    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.candidato.update({
        where: { id: candidato.id },
        data: {
          ...endereco,
          email: cleanNullableString(dto.email),
          telefone: cleanNullableString(dto.telefone),
          dddTelefone: cleanNullableString(dto.dddTelefone),
          numeroTelefone: cleanNullableString(dto.numeroTelefone),
          dadosVaga: {
            upsert: {
              create: buildPublicDadosVagaData(dto.dadosVaga),
              update: buildPublicDadosVagaData(dto.dadosVaga),
            },
          },
          lojasProximas: {
            deleteMany: {},
            create: dto.lojasProximas.map(({ codfil }) => ({ codfil })),
          },
          experiencias: { deleteMany: {}, create: buildPublicExperiencias(dto.experiencias) },
        },
      });
      return tx.candidato.findUniqueOrThrow({
        where: { id: candidato.id },
        include: candidatoInclude,
      });
    });
    await this.notifyPublicCandidatura(dto.cpf, dto);
    return saved;
  }

  private async notifyPublicCandidatura(
    cpf: string,
    submission: Partial<Pick<PublicCandidatoDto, 'vagas' | 'pcd' | 'pretensaoSalarial'>>,
  ) {
    try {
      const candidato = await this.findPublicByCpf(cpf);
      if (!candidato) return;

      const [cidadeVaga, estadosCivis, etnias] = await Promise.all([
        this.findPublicCity(candidato.cidadeVagaId),
        this.general.getEstadosCivis().catch(() => []),
        this.general.getEtnia().catch(() => []),
      ]);
      const dadosVaga = candidato.dadosVaga;
      const estadoCivil = estadosCivis.find(
        (item) => item.KEYNAM === candidato.estadoCivil,
      )?.VALKEY;
      const etnia = etnias.find((item) => item.CODETN === candidato.raccor)?.DESETN;
      await this.email.sendCandidaturaNotification(candidato.nome ?? candidato.cpf, [
        {
          title: 'Interesse profissional',
          fields: [
            { label: 'Vagas de interesse', value: submission.vagas?.join(', ') },
            {
              label: 'Pessoa com deficiência (PCD)',
              value: submission.pcd === undefined ? undefined : submission.pcd ? 'Sim' : 'Não',
            },
            { label: 'Pretensão salarial', value: submission.pretensaoSalarial },
          ],
        },
        {
          title: 'Dados pessoais',
          fields: [
            { label: 'Nome', value: candidato.nome },
            { label: 'CPF', value: candidato.cpf },
            {
              label: 'Data de nascimento',
              value: candidato.dataNascimento?.toLocaleDateString('pt-BR'),
            },
            {
              label: 'Idade',
              value: candidato.dataNascimento
                ? `${calculateAge(candidato.dataNascimento)} anos`
                : undefined,
            },
            { label: 'Estado civil', value: estadoCivil },
            { label: 'Raça/cor', value: etnia },
            {
              label: 'Grau de instrução',
              value: grauInstrucaoLabels[candidato.grauInstrucao ?? ''],
            },
          ],
        },
        {
          title: 'Contato e endereço',
          fields: [
            { label: 'E-mail', value: candidato.email },
            { label: 'Telefone', value: candidato.telefone },
            { label: 'CEP', value: candidato.cep },
            { label: 'Estado', value: candidato.estadoEndereco },
            { label: 'Cidade', value: candidato.cidadeNome },
            { label: 'Bairro', value: candidato.bairroNome },
            {
              label: 'Tipo de logradouro',
              value: tipoLogradouroLabels[candidato.tipoLogradouro ?? ''],
            },
            { label: 'Endereço', value: candidato.endereco },
            { label: 'Número', value: candidato.numero },
            { label: 'Complemento', value: candidato.complemento },
          ],
        },
        {
          title: 'Perfil profissional',
          fields: [
            { label: 'Cidade próxima', value: cidadeVaga.nome },
            { label: 'Bairros mais próximos', value: dadosVaga?.bairro },
            { label: 'Horário de estudo', value: dadosVaga?.estudoHorario },
            { label: 'Condução própria', value: dadosVaga?.conducaoPropria },
            {
              label: 'Disponibilidade de horário',
              value: dadosVaga?.disponibilidadeHorario ? 'Sim' : 'Não',
            },
            { label: 'Nome do pai', value: dadosVaga?.nomePai },
            { label: 'Nome da mãe', value: dadosVaga?.nomeMae },
            {
              label: 'Indicado por funcionário',
              value: dadosVaga?.indicadoFuncionario ? 'Sim' : 'Não',
            },
            { label: 'Loja/setor da indicação', value: dadosVaga?.indicadoLojaSetor },
            {
              label: 'Possui parente na empresa',
              value: dadosVaga?.parenteEmpresa ? 'Sim' : 'Não',
            },
            { label: 'Nome do parente', value: dadosVaga?.parenteNome },
            { label: 'Loja/setor do parente', value: dadosVaga?.parenteLojaSetor },
            { label: 'É aposentado', value: dadosVaga?.aposentado ? 'Sim' : 'Não' },
            { label: 'Tipo de aposentadoria', value: dadosVaga?.aposentadoriaTipo },
          ],
        },
        {
          title: 'Experiências profissionais',
          fields: candidato.experiencias.flatMap((experiencia, index) => [
            { label: `Experiência ${index + 1} - Empresa`, value: experiencia.empresa },
            { label: `Experiência ${index + 1} - Cargo`, value: experiencia.cargo },
            {
              label: `Experiência ${index + 1} - Admissão`,
              value: experiencia.admissao?.toLocaleDateString('pt-BR'),
            },
            {
              label: `Experiência ${index + 1} - Demissão`,
              value: experiencia.demissao?.toLocaleDateString('pt-BR'),
            },
            { label: `Experiência ${index + 1} - Motivo de saída`, value: experiencia.motivoSaida },
          ]),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao enviar notificação da candidatura ${cpf}: ${message}`);
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
      const where = this.buildCandidateListFilters(
        term,
        filial,
        situacao,
        cidadeVagaId,
        useUnaccent,
      );
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

  private async findFilteredCandidateStatuses(
    term: string,
    filial?: number,
    cidadeVagaId?: number,
  ) {
    const query = (useUnaccent: boolean) => {
      const where = this.buildCandidateListFilters(
        term,
        filial,
        undefined,
        cidadeVagaId,
        useUnaccent,
      );
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
      const data = buildCandidatoData({
        ...dto,
        cpf: undefined,
      }) as Prisma.CandidatoUncheckedUpdateInput;
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

  async updateDependente(
    candidatoId: number,
    dependenteId: number,
    dto: UpdateCandidatoDependenteDto,
  ) {
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
    const candidato = await this.prisma.candidato.findUnique({
      where: { id },
      select: { id: true },
    });
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
