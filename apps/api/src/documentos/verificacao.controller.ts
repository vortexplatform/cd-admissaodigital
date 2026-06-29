import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { AssinaturasService } from './assinaturas.service';

/**
 * Controller público (sem autenticação) para verificação de documentos
 * por código de verificação. Não expõe dados sensíveis completos.
 */
@Controller('verificar')
export class VerificacaoController {
  constructor(private readonly assinaturas: AssinaturasService) {}

  @Get(':codigo')
  async verificar(@Param('codigo') codigo: string) {
    if (!codigo || !codigo.startsWith('AD-')) {
      throw new NotFoundException('Código de verificação inválido.');
    }
    return this.assinaturas.verificarPorCodigo(codigo);
  }
}
