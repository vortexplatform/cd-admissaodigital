import { ResultadoValidacaoOcr } from '@prisma/client';
import { DocumentoValidationService } from './documento-validation.service';

const makeDocumento = (overrides: Partial<Parameters<DocumentoValidationService['validate']>[0]> = {}) => ({
  codigo: 'cpf',
  nome: 'CPF',
  template: { palavrasChave: ['RECEITA FEDERAL', 'INSCRICAO NO CPF'] },
  candidatura: { candidato: { cpf: '12345678909' } },
  ...overrides,
});

describe('DocumentoValidationService', () => {
  const service = new DocumentoValidationService();

  it('marks document as valid when keywords and candidate CPF match', () => {
    const result = service.validate(makeDocumento(), {
      text: 'Receita Federal Inscricao no CPF 123.456.789-09',
      campos: { cpf: '12345678909' },
    });

    expect(result.resultado).toBe(ResultadoValidacaoOcr.VALIDO);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('marks document as suspicious when text exists but keywords do not match', () => {
    const result = service.validate(makeDocumento(), {
      text: 'Documento sem as palavras esperadas 123.456.789-09',
      campos: { cpf: '12345678909' },
    });

    expect(result.resultado).toBe(ResultadoValidacaoOcr.SUSPEITO);
  });

  it('marks document as invalid when Google OCR extracts no text for a document with rules', () => {
    const result = service.validate(makeDocumento(), { text: '', campos: {} });

    expect(result.resultado).toBe(ResultadoValidacaoOcr.INVALIDO);
  });

  it('marks candidate identity document as invalid when CPF differs', () => {
    const result = service.validate(makeDocumento(), {
      text: 'Receita Federal Inscricao no CPF 999.999.999-99',
      campos: { cpf: '99999999999' },
    });

    expect(result.resultado).toBe(ResultadoValidacaoOcr.INVALIDO);
  });
});
