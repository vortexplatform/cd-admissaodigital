import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { GeneralService } from '../general/general.service';
import { CandidatosService } from './candidatos.service';
import { PublicCandidatoDto, PublicCandidatoUpdateDto } from './dto/public-candidato.dto';

@Controller('public/candidatos')
export class PublicCandidatosController {
  constructor(
    private readonly candidatos: CandidatosService,
    private readonly general: GeneralService,
  ) {}

  @Post('consultar')
  consultar(@Body('cpf') cpf?: string) {
    return this.candidatos.findPublicByCpf(cpf);
  }

  @Post()
  salvar(@Body() dto: PublicCandidatoDto) {
    return this.candidatos.savePublic(dto);
  }

  @Post('atualizar')
  atualizar(@Body() dto: PublicCandidatoUpdateDto) {
    return this.candidatos.updatePublic(dto);
  }

  @Get('opcoes')
  async opcoes() {
    const [cidadesVaga, estadosCivis, etnia, filiais, paises] = await Promise.all([
      this.candidatos.findPublicCities(),
      this.general.getEstadosCivis(),
      this.general.getEtnia(),
      this.general.getFiliais(),
      this.general.getPaises(),
    ]);
    return { cidadesVaga, estadosCivis, etnia, filiais, paises };
  }

  @Get('paises/:paisCod/estados')
  estados(@Param('paisCod', ParseIntPipe) paisCod: number) {
    return this.general.getEstadosByPais(paisCod);
  }

  @Get('paises/:paisCod/estados/:estadoCod/cidades')
  cidades(@Param('paisCod', ParseIntPipe) paisCod: number, @Param('estadoCod') estadoCod: string) {
    return this.general.getCidadesByEstado(paisCod, estadoCod);
  }

  @Get('cidades-vaga/:id/bairros')
  async bairrosCidadeVaga(@Param('id', ParseIntPipe) id: number) {
    const cidade = await this.candidatos.findPublicCity(id);
    return this.general.getBairrosCidadeVaga(cidade.codcid);
  }
}
