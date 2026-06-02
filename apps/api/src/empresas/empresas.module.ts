import { Module } from '@nestjs/common';
import { EmpresaCertificadosController } from './empresa-certificados.controller';
import { EmpresaCertificadosService } from './empresa-certificados.service';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

@Module({
  controllers: [EmpresasController, EmpresaCertificadosController],
  providers: [EmpresasService, EmpresaCertificadosService],
  exports: [EmpresasService, EmpresaCertificadosService],
})
export class EmpresasModule {}
