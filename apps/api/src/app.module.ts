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
import { BiometriaModule } from './biometria/biometria.module';

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
    DocumentosModule,
    BiometriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
