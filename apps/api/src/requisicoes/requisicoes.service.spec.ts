import { StatusRequisicaoVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequisicoesService } from './requisicoes.service';

describe('RequisicoesService', () => {
  it('cria novas requisições com status aberta', async () => {
    const requisicaoVaga = {
      create: jest.fn().mockResolvedValue({ id: 1, status: StatusRequisicaoVaga.ABERTA }),
    };
    const service = new RequisicoesService({ requisicaoVaga } as unknown as PrismaService);

    await service.create({ status: StatusRequisicaoVaga.RASCUNHO }, 10);

    expect(requisicaoVaga.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          criadoPorUserId: 10,
          status: StatusRequisicaoVaga.ABERTA,
        }),
      }),
    );
  });
});
