import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as forge from 'node-forge';
import { PrismaService } from '../prisma/prisma.service';

type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type CertificateMetadata = {
  subject: string;
  issuer: string;
  serialNumber: string;
  validoDe: Date;
  validoAte: Date;
  thumbprint: string;
};

@Injectable()
export class EmpresaCertificadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findByEmpresa(userId: number, empresaId: number) {
    await this.ensureEmpresaAccess(userId, empresaId);

    return this.prisma.empresaCertificadoA1.findMany({
      where: { empresaId },
      select: {
        id: true,
        empresaId: true,
        nomeArquivo: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        validoDe: true,
        validoAte: true,
        thumbprint: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ ativo: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upload(userId: number, empresaId: number, senha: string, file?: UploadedMemoryFile) {
    await this.ensureEmpresaAccess(userId, empresaId);
    if (!file) throw new BadRequestException('Envie o arquivo .pfx ou .p12.');
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException('O certificado deve ter no máximo 2MB.');
    if (!file.originalname.toLowerCase().match(/\.(pfx|p12)$/)) {
      throw new BadRequestException('Envie um certificado A1 em formato .pfx ou .p12.');
    }

    const metadata = this.extractMetadata(file.buffer, senha);
    if (metadata.validoAte <= new Date()) throw new BadRequestException('Certificado expirado.');

    await this.prisma.empresaCertificadoA1.updateMany({
      where: { empresaId, ativo: true },
      data: { ativo: false },
    });

    return this.prisma.empresaCertificadoA1.create({
      data: {
        empresaId,
        nomeArquivo: file.originalname,
        pfxCriptografado: this.encrypt(file.buffer.toString('base64')),
        senhaCriptografada: this.encrypt(senha),
        subject: metadata.subject,
        issuer: metadata.issuer,
        serialNumber: metadata.serialNumber,
        validoDe: metadata.validoDe,
        validoAte: metadata.validoAte,
        thumbprint: metadata.thumbprint,
        ativo: true,
        criadoPorUserId: userId,
      },
      select: {
        id: true,
        empresaId: true,
        nomeArquivo: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        validoDe: true,
        validoAte: true,
        thumbprint: true,
        ativo: true,
        createdAt: true,
      },
    });
  }

  async getActiveCertificateForEmpresa(empresaId: number) {
    const certificado = await this.prisma.empresaCertificadoA1.findFirst({
      where: { empresaId, ativo: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!certificado) throw new BadRequestException('Empresa sem certificado A1 ativo para assinar PDFs.');
    if (certificado.validoAte <= new Date()) throw new BadRequestException('Certificado A1 da empresa está expirado.');

    return {
      id: certificado.id,
      pfx: Buffer.from(this.decrypt(certificado.pfxCriptografado), 'base64'),
      password: this.decrypt(certificado.senhaCriptografada),
      subject: certificado.subject,
      issuer: certificado.issuer,
      serialNumber: certificado.serialNumber,
      thumbprint: certificado.thumbprint,
    };
  }

  private extractMetadata(pfxBuffer: Buffer, password: string): CertificateMetadata {
    try {
      const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
      const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
      const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      const certificate = certBag?.cert;
      if (!certificate) throw new Error('Certificado não encontrado no arquivo.');
      if (!keyBag?.key) throw new Error('Chave privada não encontrada no certificado.');

      const asText = (attrs: forge.pki.CertificateField[]) =>
        attrs.map((attr) => `${attr.shortName ?? attr.name}=${attr.value}`).join(', ');
      const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
      const thumbprint = createHash('sha1').update(Buffer.from(der, 'binary')).digest('hex').toUpperCase();

      return {
        subject: asText(certificate.subject.attributes),
        issuer: asText(certificate.issuer.attributes),
        serialNumber: certificate.serialNumber,
        validoDe: certificate.validity.notBefore,
        validoAte: certificate.validity.notAfter,
        thumbprint,
      };
    } catch (err) {
      throw new BadRequestException(`Certificado inválido ou senha incorreta: ${(err as Error).message}`);
    }
  }

  private async ensureEmpresaAccess(userId: number, empresaId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.RH)) {
      throw new ForbiddenException('Acesso restrito ao RH/Admin.');
    }
    if (user.role === Role.ADMIN) return;

    const membership = await this.prisma.empresaUsuario.findUnique({
      where: { userId_empresaId: { userId, empresaId } },
    });
    if (!membership) throw new ForbiddenException('Usuário RH sem acesso a esta empresa.');
  }

  private encryptionKey() {
    const source = this.config.get<string>('CERTIFICATE_ENCRYPTION_KEY') ?? this.config.get<string>('JWT_SECRET');
    if (!source) throw new Error('Configure CERTIFICATE_ENCRYPTION_KEY para criptografar certificados A1.');

    return createHash('sha256').update(source).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  private decrypt(value: string) {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
