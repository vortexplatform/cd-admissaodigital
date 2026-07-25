import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmpresasModule } from './empresas/empresas.module';
import { RequisicoesModule } from './requisicoes/requisicoes.module';
import { CandidatosModule } from './candidatos/candidatos.module';
import { CandidaturasModule } from './candidaturas/candidaturas.module';
import { DocumentosModule } from './documentos/documentos.module';
import { DocumentosTemplatesModule } from './documentos-templates/documentos-templates.module';
import { BiometriaModule } from './biometria/biometria.module';
import { IntegracaoSeniorModule } from './integracao-senior/integracao-senior.module';
import { GeneralModule } from './general/general.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CidadesVagaModule } from './cidades-vaga/cidades-vaga.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '../..', `.env.${process.env.NODE_ENV ?? 'development'}`),
        path.resolve(process.cwd(), '../..', '.env'),
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmpresasModule,
    RequisicoesModule,
    CandidatosModule,
    CandidaturasModule,
    DocumentosTemplatesModule,
    DocumentosModule,
    BiometriaModule,
    IntegracaoSeniorModule,
    GeneralModule,
    DashboardModule,
    CidadesVagaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
