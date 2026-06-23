import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModoSubstituicaoDocumento, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { defaultDocumentoSubstituicoes, defaultDocumentoTemplates } from './default-documentos';
import { UpsertDocumentoTemplateDto } from './dto/documento-template.dto';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'documento';

const cleanList = (values?: string[]) =>
  Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));

const templateInclude = {
  substitui: { include: { substituido: { select: { nome: true } } } },
} satisfies Prisma.DocumentoTemplateInclude;

@Injectable()
export class DocumentoTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, empresaId: number) {
    await this.ensureEmpresaAccess(userId, empresaId);

    return this.prisma.documentoTemplate.findMany({
      where: { empresaId },
      include: templateInclude,
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async create(userId: number, empresaId: number, dto: UpsertDocumentoTemplateDto) {
    await this.ensureEmpresaAccess(userId, empresaId);
    await this.validateSubstituicoes(empresaId, null, dto.substituicoes ?? []);

    const created = await this.prisma.documentoTemplate.create({
      data: {
        empresaId,
        codigo: await this.nextCodigo(empresaId, dto.nome),
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        palavrasChave: cleanList(dto.palavrasChave),
        mimeTypesPermitidos: cleanList(dto.mimeTypesPermitidos),
        condicaoGenero: dto.condicaoGenero?.trim() || null,
        condicaoPossuiFilhos: dto.condicaoPossuiFilhos ?? null,
        obrigatorio: dto.obrigatorio ?? true,
        ordem: dto.ordem ?? 0,
        substitui: {
          create: (dto.substituicoes ?? []).map((item) => ({
            substituidoTemplateId: item.substituidoTemplateId,
            modo: item.modo,
            campoOcr: item.campoOcr?.trim() || null,
          })),
        },
      },
    });

    return this.findTemplate(created.id);
  }

  async update(userId: number, empresaId: number, id: number, dto: UpsertDocumentoTemplateDto) {
    await this.ensureEmpresaAccess(userId, empresaId);
    const existing = await this.prisma.documentoTemplate.findUnique({ where: { id } });
    if (!existing || existing.empresaId !== empresaId) throw new NotFoundException('Documento não encontrado.');
    await this.validateSubstituicoes(empresaId, id, dto.substituicoes ?? []);

    await this.prisma.$transaction(async (tx) => {
      await tx.documentoTemplate.update({
        where: { id },
        data: {
          nome: dto.nome.trim(),
          descricao: dto.descricao?.trim() || null,
          palavrasChave: cleanList(dto.palavrasChave),
          mimeTypesPermitidos: cleanList(dto.mimeTypesPermitidos),
          condicaoGenero: dto.condicaoGenero?.trim() || null,
          condicaoPossuiFilhos: dto.condicaoPossuiFilhos ?? null,
          obrigatorio: dto.obrigatorio ?? true,
          ordem: dto.ordem ?? 0,
        },
      });
      await tx.documentoTemplateSubstituicao.deleteMany({ where: { templateId: id } });
      if (dto.substituicoes?.length) {
        await tx.documentoTemplateSubstituicao.createMany({
          data: dto.substituicoes.map((item) => ({
            templateId: id,
            substituidoTemplateId: item.substituidoTemplateId,
            modo: item.modo,
            campoOcr: item.campoOcr?.trim() || null,
          })),
        });
      }
    });

    return this.findTemplate(id);
  }

  async remove(userId: number, empresaId: number, id: number) {
    await this.ensureEmpresaAccess(userId, empresaId);
    await this.prisma.documentoTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async seedDefaults(userId: number, empresaId: number) {
    await this.ensureEmpresaAccess(userId, empresaId);
    const existing = await this.prisma.documentoTemplate.findMany({
      where: { empresaId },
      select: { nome: true },
    });
    const existingNames = new Set(existing.map((item) => item.nome));
    const toCreate = defaultDocumentoTemplates.filter((item) => !existingNames.has(item.nome));

    for (const item of toCreate) {
      await this.prisma.documentoTemplate.create({
        data: {
          empresaId,
          codigo: await this.nextCodigo(empresaId, item.nome),
          nome: item.nome,
          descricao: item.descricao,
          palavrasChave: item.palavrasChave,
          mimeTypesPermitidos: item.mimeTypesPermitidos,
          condicaoGenero: item.condicaoGenero,
          condicaoPossuiFilhos: item.condicaoPossuiFilhos,
          obrigatorio: item.obrigatorio,
          ordem: item.ordem,
        },
      });
    }

    const templates = await this.prisma.documentoTemplate.findMany({
      where: { empresaId },
      select: { id: true, nome: true },
    });
    const byName = new Map(templates.map((item) => [item.nome, item.id]));

    for (const rule of defaultDocumentoSubstituicoes) {
      const templateId = byName.get(rule.templateNome);
      const substituidoTemplateId = byName.get(rule.substituidoNome);
      if (!templateId || !substituidoTemplateId) continue;

      await this.prisma.documentoTemplateSubstituicao.upsert({
        where: { templateId_substituidoTemplateId: { templateId, substituidoTemplateId } },
        update: {},
        create: {
          templateId,
          substituidoTemplateId,
          modo: rule.modo as ModoSubstituicaoDocumento,
          campoOcr: rule.campoOcr,
        },
      });
    }

    return this.list(userId, empresaId);
  }

  getDefaults() {
    return defaultDocumentoTemplates;
  }

  private async validateSubstituicoes(
    empresaId: number,
    templateId: number | null,
    substituicoes: Array<{ substituidoTemplateId: number; modo: ModoSubstituicaoDocumento; campoOcr?: string }>,
  ) {
    const seen = new Set<number>();
    for (const item of substituicoes) {
      if (templateId && item.substituidoTemplateId === templateId) {
        throw new BadRequestException('Um documento não pode substituir a si mesmo.');
      }
      if (seen.has(item.substituidoTemplateId)) {
        throw new BadRequestException('Existe substituição duplicada.');
      }
      if (item.modo === ModoSubstituicaoDocumento.CAMPO_OCR && !item.campoOcr?.trim()) {
        throw new BadRequestException('Informe o campo OCR da substituição.');
      }
      seen.add(item.substituidoTemplateId);
    }

    if (seen.size === 0) return;
    const count = await this.prisma.documentoTemplate.count({
      where: { empresaId, id: { in: Array.from(seen) } },
    });
    if (count !== seen.size) throw new BadRequestException('Documento substituído inválido.');
  }

  private async findTemplate(id: number) {
    return this.prisma.documentoTemplate.findUniqueOrThrow({ where: { id }, include: templateInclude });
  }

  private async nextCodigo(empresaId: number, nome: string) {
    const base = slugify(nome);
    let codigo = base;
    let suffix = 2;
    while (await this.prisma.documentoTemplate.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })) {
      codigo = `${base}-${suffix}`;
      suffix += 1;
    }

    return codigo;
  }

  private async ensureEmpresaAccess(userId: number, empresaId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === Role.ADMIN) return;

    const member = await this.prisma.empresaUsuario.findUnique({
      where: { userId_empresaId: { userId, empresaId } },
    });
    if (!member || user?.role !== Role.RH) {
      throw new ForbiddenException('Acesso restrito ao RH desta empresa.');
    }
  }
}
