import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SeniorApiService } from '../general/senior-api.service';
import { GerarAdmissaoDto } from './gerar-admissao.dto';

@Injectable()
export class IntegracaoSeniorService {
  private readonly rhApiBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seniorApi: SeniorApiService,
    private readonly config: ConfigService,
  ) {
    this.rhApiBase = this.config.getOrThrow<string>('SENIOR_API_URL');
  }

  async gerarAdmissao(dto: GerarAdmissaoDto, admissaoGeradaPorUserId: number): Promise<unknown> {
    // 1. Busca candidato
    const candidato = await this.prisma.candidato.findUnique({
      where: { id: dto.candidatoId },
      include: { dependentes: true },
    });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    // 2. Busca candidatura APROVADO
    const candidatura = dto.candidaturaId
      ? await this.prisma.candidatura.findUnique({
          where: { id: dto.candidaturaId },
          include: { requisicao: { include: { empresa: true } } },
        })
      : await this.prisma.candidatura.findFirst({
          where: { candidatoId: dto.candidatoId, status: 'APROVADO' },
          include: { requisicao: { include: { empresa: true } } },
          orderBy: { createdAt: 'desc' },
        });
    if (!candidatura) {
      throw new BadRequestException('Candidato não possui candidatura aprovada');
    }
    if (candidatura.status !== 'APROVADO') {
      throw new BadRequestException('Candidatura não está com status APROVADO');
    }

    const { requisicao } = candidatura;

    if (!requisicao.empresa) {
      throw new BadRequestException('Requisição sem empresa vinculada');
    }

    // 3. Monta payload
    const toInt = (v: string | null | undefined) =>
      v ? parseInt(v.replace(/\D/g, ''), 10) : 0;

    const toDigits = (v: string | null | undefined) =>
      v ? v.replace(/\D/g, '') : '';

    const semAcento = (v: string) =>
      v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    const tipadmMap: Record<string, number> = {
      PRIMEIRO_EMPREGO: 1,
      REEMPREGO: 2,
    };

    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    };

    const sexoMap: Record<string, string> = { MASCULINO: 'M', FEMININO: 'F' };

    const payload = {
      numemp: parseInt(requisicao.empresa.codigoEmpresaSenior, 10),
      tipcol: 1,
      nomfun: semAcento(candidato.nome ?? ''),
      numcpf: toInt(candidato.cpf),
      datadm: dto.datadm,
      estpos: 2,
      postra: requisicao.postoTrabalho ?? '',
      datnas: formatDate(candidato.dataNascimento),
      tipadm: tipadmMap[candidato.tipoAdmissao ?? ''] ?? 2,
      codesc: toInt(requisicao.escala),
      tipsex: candidato.genero ?? '',
      estciv: toInt(candidato.estadoCivil),
      grains: toInt(candidato.grauInstrucao),
      codnac: candidato.nacionalidade ?? 0,
      numpis: toInt(candidato.pis),
      raccor: candidato.raccor ?? 0,
      r034cpl: {
        codpai: toInt(candidato.pais),
        codest: candidato.estadoEndereco ?? '',
        codcid: candidato.cidadeCod ?? 0,
        codbai: candidato.bairroCod ?? 0,
        endcep: toInt(candidato.cep),
        tiplgr: candidato.tipoLogradouro ?? '',
        endrua: candidato.endereco ?? '',
        endnum: candidato.numero ?? '',
        numtel: toDigits(candidato.numeroTelefone),
        painas: toInt(candidato.paisNascimento),
        estnas: candidato.estadoNascimento ?? '',
        ccinas: candidato.cidadeNascimentoCod ?? 0,
        numcid: candidato.numeroRg ?? '',
        emicid: candidato.orgaoEmissorRg ?? '',
        zonele: candidato.zonaTituloEleitor ?? '',
        secele: candidato.secaoTituloEleitor ?? '',
        numele: candidato.numeroTituloEleitor ?? '',
        numres: candidato.numeroCertReservista ?? '',
        dditel: toInt(candidato.ddiTelefone) || 55,
        dddtel: toInt(candidato.dddTelefone),
        nmddi2: toInt(candidato.ddiTelefone2),
        nmddd2: toInt(candidato.dddTelefone2),
        nmtel2: candidato.numeroTelefone2 ?? ' ',
      },
      r036dep: candidato.dependentes.map((dep) => ({
        nomdep: semAcento(dep.nome),
        codpar: toInt(dep.codigoGrauParentesco),
        tipdep: dep.codigoTipoEsocial,
        tipsex: sexoMap[dep.sexo] ?? dep.sexo,
        depir: dep.dependenteIr ? 1 : 0,
        datnas: dep.dataNascimento ? formatDate(dep.dataNascimento) : null,
        numcpf: dep.cpf ? toInt(dep.cpf) : 0,
      })),
    };

    // 4. Envia para a API Senior
    const result = await this.seniorApi.post<{ numcad?: number }>('/admissao/colaborador', payload);

    // Converte datadm (dd/MM/yyyy) para Date
    const [dd, mm, yyyy] = dto.datadm.split('/');
    const dataAdmissao = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    // 5. Atualiza candidatura com a data de admissão, matrícula, status e o usuário que gerou
    const matricula = result?.numcad ? String(result.numcad) : null;
    await this.prisma.candidatura.update({
      where: { id: candidatura.id },
      data: { admissao: dataAdmissao, admissaoGeradaPorUserId, matricula, status: 'EFETIVADO' },
    });

    // 6. Atualiza status da requisição
    await this.prisma.requisicaoVaga.update({
      where: { id: requisicao.id },
      data: {
        status: 'INTEGRADA_SENIOR',
        integradoSeniorEm: new Date(),
        codigoColaboradorSenior: result?.numcad ? String(result.numcad) : null,
      },
    });

    return result;
  }

  async consultarMatriculaAtiva(candidaturaId: number): Promise<{ numcad: number | null }> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
      },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada');

    const numemp = parseInt(candidatura.requisicao.empresa?.codigoEmpresaSenior ?? '0', 10);
    const cpf = candidatura.candidato.cpf.replace(/\D/g, '');

    const { data } = await axios.get<{ numcad: number | null }>(
      `${this.rhApiBase}/admissao/${numemp}/1/matricula/${cpf}`,
    );

    return { numcad: data.numcad ?? null };
  }

  async cancelarEfetivacao(candidaturaId: number): Promise<void> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
      },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada');

    // Garante que não há matrícula ativa antes de cancelar
    const numemp = parseInt(candidatura.requisicao.empresa?.codigoEmpresaSenior ?? '0', 10);
    const cpf = candidatura.candidato.cpf.replace(/\D/g, '');
    const { data } = await axios.get<{ numcad: number | null }>(
      `${this.rhApiBase}/admissao/${numemp}/1/matricula/${cpf}`,
    );
    if (data.numcad) {
      throw new BadRequestException(
        'Não é possível cancelar: colaborador possui matrícula ativa no sistema.',
      );
    }

    await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: {
        status: 'APROVADO',
        admissao: null,
        matricula: null,
        admissaoGeradaPorUserId: null,
      },
    });

    await this.prisma.requisicaoVaga.update({
      where: { id: candidatura.requisicaoId },
      data: {
        status: 'APROVADA',
        integradoSeniorEm: null,
        codigoColaboradorSenior: null,
      },
    });
  }
}
