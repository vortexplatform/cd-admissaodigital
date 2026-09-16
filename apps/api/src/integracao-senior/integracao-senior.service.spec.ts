import axios from 'axios';
import { IntegracaoSeniorService } from './integracao-senior.service';

jest.mock('axios');

describe('IntegracaoSeniorService', () => {
  const seniorApi = { get: jest.fn(), post: jest.fn() };
  const config = { getOrThrow: jest.fn().mockReturnValue('http://rh-api') };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marca o candidato como admitido ao gerar a admissão', async () => {
    seniorApi.post.mockResolvedValue({ numcad: 123 });
    const prisma = {
      candidato: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          nome: 'Candidato',
          cpf: '12345678900',
          dataNascimento: new Date('1990-01-01'),
          tipoAposentadoria: 0,
          dependentes: [],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      candidatura: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          candidatoId: 2,
          requisicaoId: 1,
          status: 'APROVADO',
          requisicao: { empresa: { codigoEmpresaSenior: '1' }, postoTrabalho: 'POSTO' },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      requisicaoVaga: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new IntegracaoSeniorService(prisma as never, seniorApi as never, config as never);

    await service.gerarAdmissao({ candidatoId: 2, candidaturaId: 8, datadm: '16/09/2026' }, 4);

    expect(prisma.candidato.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { situacao: 'ADMITIDO' },
    });
  });

  it('retorna o candidato para ativo no processo ao cancelar a efetivação', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { numcad: null } });
    const prisma = {
      candidato: { update: jest.fn().mockResolvedValue({}) },
      candidatura: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          candidatoId: 2,
          candidaturaId: 8,
          requisicaoId: 1,
          candidato: { cpf: '12345678900' },
          requisicao: { empresa: { codigoEmpresaSenior: '1' } },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      requisicaoVaga: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new IntegracaoSeniorService(prisma as never, seniorApi as never, config as never);

    await service.cancelarEfetivacao(8);

    expect(prisma.candidato.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { situacao: 'ATIVO_PROCESSO' },
    });
  });

  it('retorna todos os cadastros do candidato na Senior', async () => {
    seniorApi.get.mockResolvedValue([
      {
        NUMEMP: 1,
        TIPCOL: 1,
        NUMCAD: 801234,
        DATADM: '2026-09-01T00:00:00.000Z',
        CODFIL: 8,
        DESSIT: 'Ativo',
        DATAFA: '2026-09-10T00:00:00.000Z',
        SITAFA: 1,
      },
      {
        NUMEMP: 1,
        TIPCOL: 1,
        NUMCAD: 701122,
        DATADM: '2024-03-15T00:00:00.000Z',
        CODFIL: 2,
        DESSIT: 'Demitido',
        DATAFA: '2025-12-20T00:00:00.000Z',
        SITAFA: 7,
      },
    ]);
    const prisma = {
      candidato: {
        findUnique: jest.fn().mockResolvedValue({ id: 2, nome: 'Candidato' }),
      },
    };
    const service = new IntegracaoSeniorService(prisma as never, seniorApi as never, config as never);

    await expect(service.consultarColaboradorPorCpf('123.456.789-09')).resolves.toEqual([
      {
        numemp: 1,
        tipcol: 1,
        matricula: 801234,
        nome: 'Candidato',
        admissao: '2026-09-01T00:00:00.000Z',
        filial: 8,
        situacao: 'Ativo',
        desligamento: null,
      },
      {
        numemp: 1,
        tipcol: 1,
        matricula: 701122,
        nome: 'Candidato',
        admissao: '2024-03-15T00:00:00.000Z',
        filial: 2,
        situacao: 'Demitido',
        desligamento: '2025-12-20T00:00:00.000Z',
      },
    ]);
  });
});
