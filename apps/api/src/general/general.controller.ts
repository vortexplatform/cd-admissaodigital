import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneralService } from './general.service';

@UseGuards(JwtAuthGuard)
@Controller('general')
export class GeneralController {
  constructor(private readonly general: GeneralService) {}

  @Get('nacionalidades')
  getNacionalidades() {
    return this.general.getNacionalidades();
  }

  @Get('paises')
  getPaises() {
    return this.general.getPaises();
  }

  @Get('paises/:paisCod/estados')
  getEstadosByPais(@Param('paisCod', ParseIntPipe) paisCod: number) {
    return this.general.getEstadosByPais(paisCod);
  }

  @Get('paises/:paisCod/estados/:estadoCod/cidades')
  getCidadesByEstado(
    @Param('paisCod', ParseIntPipe) paisCod: number,
    @Param('estadoCod') estadoCod: string,
  ) {
    return this.general.getCidadesByEstado(paisCod, estadoCod);
  }

  @Get('cidades/:cidadeCod/bairros')
  getBairros(@Param('cidadeCod', ParseIntPipe) cidadeCod: number) {
    return this.general.getBairrosByCidade(cidadeCod);
  }

  @Get('tipos-logradouro')
  getTiposLogradouro() {
    return this.general.getTiposLogradouro();
  }

  @Get('estados-civis')
  getEstadosCivis() {
    return this.general.getEstadosCivis();
  }

  @Get('tipos-certidao-civil')
  getTiposCertidaoCivil() {
    return this.general.getTiposCertidaoCivil();
  }

  @Get('etnia')
  getEtnia() {
    return this.general.getEtnia();
  }
}
