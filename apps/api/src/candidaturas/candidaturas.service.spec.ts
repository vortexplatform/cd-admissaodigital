import { StatusRequisicaoVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CandidaturasService } from './candidaturas.service';

describe('CandidaturasService', () => {
  it('marca a requisição como aguardando candidato ao vincular candidatura', async () => {
    const tx = {
      candidatura: {
        create: jest.fn().mockResolvedValue({ id: 8, requisicaoId: 1, candidatoId: 2 }),
      },
      requisicaoVaga: {
        update: jest.fn().mockResolvedValue({}),
      },
      documentoAdmissao: {
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    };
    const prisma = {
      requisicaoVaga: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      candidato: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new CandidaturasService(prisma as unknown as PrismaService);

    await service.create(1, { candidatoId: 2 });

    expect(tx.requisicaoVaga.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusRequisicaoVaga.AGUARDANDO_CANDIDATO },
    });
  });

  it('marca a requisição como aberta ao remover o último vínculo', async () => {
    const tx = {
      candidatura: {
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      requisicaoVaga: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      candidatura: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, requisicaoId: 1 }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new CandidaturasService(prisma as unknown as PrismaService);

    await service.remove(8);

    expect(tx.requisicaoVaga.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusRequisicaoVaga.ABERTA },
    });
  });

  it('mantém o status atual ao remover vínculo se ainda houver candidatos', async () => {
    const tx = {
      candidatura: {
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(1),
      },
      requisicaoVaga: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      candidatura: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, requisicaoId: 1 }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new CandidaturasService(prisma as unknown as PrismaService);

    await service.remove(8);

    expect(tx.requisicaoVaga.update).not.toHaveBeenCalled();
  });
});
