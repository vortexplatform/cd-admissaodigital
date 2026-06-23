import { Injectable } from '@nestjs/common';
import { SeniorApiService } from './senior-api.service';

export interface Nacionalidade {
  CODNAC: number;
  DESNAC: string;
}

export interface Pais {
  CODPAI: number;
  NOMPAI: string;
}

export interface Estado {
  CODPAI: number;
  CODEST: string;
  DESEST: string;
}

export interface Cidade {
  CODCID: number;
  NOMCID: string;
  CODPAI: number;
  CODEST: string;
}

export interface Bairro {
  CODCID: number;
  CODBAI: number;
  NOMBAI: string;
}

export interface TipoLogradouro {
  KEYNAM: string;
  VALKEY: string;
}

export interface EstadoCivil {
  KEYNAM: string;
  VALKEY: string;
}

export interface TipoCertidaoCivil {
  KEYNAM: string;
  VALKEY: string;
}

export interface Etnicidade {
  CODETN: number;
  DESETN: string;
  ESOETN: number;
}

@Injectable()
export class GeneralService {
  constructor(private readonly seniorApi: SeniorApiService) {}

  getNacionalidades(): Promise<Nacionalidade[]> {
    return this.seniorApi.get('/general/nacionalidades');
  }

  getPaises(): Promise<Pais[]> {
    return this.seniorApi.get('/general/paises');
  }

  getEstadosByPais(paisCod: number): Promise<Estado[]> {
    return this.seniorApi.get(`/general/paises/${paisCod}/estados`);
  }

  getCidadesByEstado(paisCod: number, estadoCod: string): Promise<Cidade[]> {
    return this.seniorApi.get(`/general/paises/${paisCod}/estados/${estadoCod}/cidades`);
  }

  getBairrosByCidade(cidadeCod: number): Promise<Bairro[]> {
    return this.seniorApi.get(`/general/cidades/${cidadeCod}/bairros`);
  }

  getTiposLogradouro(): Promise<TipoLogradouro[]> {
    return this.seniorApi.get('/general/tipos-logradouro');
  }

  getEstadosCivis(): Promise<EstadoCivil[]> {
    return this.seniorApi.get('/general/estados-civis');
  }

  getTiposCertidaoCivil(): Promise<TipoCertidaoCivil[]> {
    return this.seniorApi.get('/general/tipos-certidao-civil');
  }

  getEtnia(): Promise<Etnicidade[]> {
    return this.seniorApi.get('/general/etnia');
  }
}
