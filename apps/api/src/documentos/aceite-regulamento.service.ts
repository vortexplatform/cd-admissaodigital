import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AceiteRegulamentoDto {
  versaoRegulamento: string;
  hashRegulamento: string;
  documentoAssinaturaId?: number;
}

type RequestEvidence = { ip?: string; userAgent?: string };

@Injectable()
export class AceiteRegulamentoService {
  constructor(private readonly prisma: PrismaService) {}

  async aceitar(userId: number, dto: AceiteRegulamentoDto, evidence: RequestEvidence) {
    const candidato = await this.prisma.candidato.findUnique({ where: { userId } });
    if (!candidato) throw new ForbiddenException('Apenas candidatos podem aceitar o regulamento.');

    if (!dto.versaoRegulamento?.trim()) throw new BadRequestException('Versão do regulamento é obrigatória.');
    if (!dto.hashRegulamento?.trim()) throw new BadRequestException('Hash do regulamento é obrigatório.');

    if (dto.documentoAssinaturaId) {
      const doc = await this.prisma.documentoAssinatura.findUnique({
        where: { id: dto.documentoAssinaturaId },
        include: { envelope: true },
      });
      if (!doc || doc.envelope.userId !== userId) {
        throw new NotFoundException('Documento de assinatura não encontrado.');
      }
    }

    const codigoVerificacao = `REG-${randomBytes(4).toString('hex').toUpperCase()}`;

    const aceite = await this.prisma.aceiteRegulamento.create({
      data: {
        candidatoId: candidato.id,
        documentoAssinaturaId: dto.documentoAssinaturaId ?? null,
        versaoRegulamento: dto.versaoRegulamento,
        hashRegulamento: dto.hashRegulamento,
        aceitoEm: new Date(),
        ip: evidence.ip ?? null,
        userAgent: evidence.userAgent ?? null,
        codigoVerificacao,
      },
    });

    return {
      id: aceite.id,
      codigoVerificacao: aceite.codigoVerificacao,
      versaoRegulamento: aceite.versaoRegulamento,
      aceitoEm: aceite.aceitoEm.toISOString(),
      mensagem: 'Aceite do Regulamento Interno registrado com sucesso.',
    };
  }

  async listarParaCandidato(userId: number) {
    const candidato = await this.prisma.candidato.findUnique({ where: { userId } });
    if (!candidato) throw new ForbiddenException('Apenas candidatos podem consultar aceites.');

    return this.prisma.aceiteRegulamento.findMany({
      where: { candidatoId: candidato.id },
      orderBy: { aceitoEm: 'desc' },
      select: {
        id: true,
        versaoRegulamento: true,
        hashRegulamento: true,
        aceitoEm: true,
        codigoVerificacao: true,
        documentoAssinaturaId: true,
      },
    });
  }
}
