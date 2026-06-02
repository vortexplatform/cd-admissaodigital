import { Injectable } from '@nestjs/common';
import { ResultadoValidacaoOcr } from '@prisma/client';
import type { OcrResult } from './ocr.service';

export type DocumentoValidationResult = {
  resultado: ResultadoValidacaoOcr;
  score: number;
  motivos: string[];
  campos: OcrResult['campos'];
};

type DocumentoParaValidacao = {
  codigo: string;
  nome: string;
  template?: { palavrasChave: string[] } | null;
  candidatura: { candidato: { cpf: string | null } };
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const normalizeCpf = (value: string | null | undefined) => value?.replace(/\D/g, '') ?? '';

@Injectable()
export class DocumentoValidationService {
  validate(documento: DocumentoParaValidacao, ocr: OcrResult): DocumentoValidationResult {
    const motivos: string[] = [];
    const palavrasChave = documento.template?.palavrasChave ?? [];
    const textoNormalizado = normalizeText(ocr.text);
    const palavrasEncontradas = palavrasChave.filter((kw) => textoNormalizado.includes(normalizeText(kw)));

    if (palavrasChave.length === 0) {
      return {
        resultado: ResultadoValidacaoOcr.VALIDO,
        score: 80,
        motivos: ['Documento sem palavras-chave configuradas para validação OCR.'],
        campos: ocr.campos,
      };
    }

    if (!ocr.text.trim()) {
      return {
        resultado: ResultadoValidacaoOcr.INVALIDO,
        score: 0,
        motivos: ['Não foi possível extrair texto com Google OCR. Envie uma imagem/PDF mais nítido.'],
        campos: ocr.campos,
      };
    }

    let score = 20;

    if (palavrasEncontradas.length > 0) {
      score += 60;
      motivos.push(`Palavras-chave reconhecidas: ${palavrasEncontradas.join(', ')}.`);
    } else {
      motivos.push('Nenhuma palavra-chave esperada foi reconhecida no documento.');
    }

    if (ocr.campos.cpf) {
      score += 10;
      motivos.push('CPF detectado pelo OCR.');
    }

    const cpfCandidato = normalizeCpf(documento.candidatura.candidato.cpf);
    const cpfOcr = normalizeCpf(ocr.campos.cpf);
    if (this.shouldCompareCandidateCpf(documento) && cpfCandidato) {
      if (!cpfOcr) {
        score -= 20;
        motivos.push('CPF do candidato não foi localizado no documento.');
      } else if (cpfOcr !== cpfCandidato) {
        return {
          resultado: ResultadoValidacaoOcr.INVALIDO,
          score: 10,
          motivos: ['CPF detectado no documento é diferente do CPF cadastrado do candidato.'],
          campos: ocr.campos,
        };
      } else {
        score += 20;
        motivos.push('CPF detectado confere com o CPF do candidato.');
      }
    }

    const normalizedScore = Math.max(0, Math.min(score, 100));
    const resultado = normalizedScore >= 80 ? ResultadoValidacaoOcr.VALIDO : ResultadoValidacaoOcr.SUSPEITO;

    return { resultado, score: normalizedScore, motivos, campos: ocr.campos };
  }

  private shouldCompareCandidateCpf(documento: DocumentoParaValidacao) {
    const value = normalizeText(`${documento.codigo} ${documento.nome}`);
    const isCandidateIdentity = ['CPF', 'IDENTIDADE', 'RG', 'CNH', 'HABILITACAO'].some((term) =>
      value.includes(term),
    );
    const isDependentDocument = ['FILHO', 'FILHOS', 'CONJUGE', 'CONJUGE'].some((term) =>
      value.includes(term),
    );

    return isCandidateIdentity && !isDependentDocument;
  }
}
