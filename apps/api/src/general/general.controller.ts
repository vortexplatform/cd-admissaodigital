import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  GeneralService,
  type FilialSenior,
  type EscalaSenior,
  type EtapaSenior,
  type PostoTrabalhoSenior,
  type PostoTrabalhoCaracteristicaSenior,
  type TipoDependenteEsocial,
  type TipoGrauParentesco,
} from './general.service';

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

  @Get('tipos-grau-parentesco')
  getTiposGrauParentesco(): Promise<TipoGrauParentesco[]> {
    return this.general.getTiposGrauParentesco();
  }

  @Get('tipos-dependente-esocial')
  getTiposDependenteEsocial(): Promise<TipoDependenteEsocial[]> {
    return this.general.getTiposDependenteEsocial();
  }

  @Get('filial')
  getFiliais(): Promise<FilialSenior[]> {
    return this.general.getFiliais();
  }

  @Get('workschedule')
  getWorkschedules(): Promise<EscalaSenior[]> {
    return this.general.getWorkschedules();
  }

  @Get('workstation/:code/characteristics')
  getWorkstationCharacteristics(
    @Param('code') code: string,
  ): Promise<PostoTrabalhoCaracteristicaSenior[]> {
    return this.general.getWorkstationCharacteristics(code);
  }

  @Get('workstation/:numemp/:filial')
  getWorkstations(
    @Param('numemp', ParseIntPipe) numemp: number,
    @Param('filial', ParseIntPipe) filial: number,
  ): Promise<PostoTrabalhoSenior[]> {
    return this.general.getWorkstations(numemp, filial);
  }

  @Get('etapas')
  getEtapas(): Promise<EtapaSenior[]> {
    return this.general.getEtapas();
  }
}
