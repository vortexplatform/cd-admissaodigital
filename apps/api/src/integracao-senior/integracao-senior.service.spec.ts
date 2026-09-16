import axios from 'axios';
import { IntegracaoSeniorService } from './integracao-senior.service';

jest.mock('axios');

describe('IntegracaoSeniorService', () => {
  const seniorApi = { post: jest.fn() };
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
});
