import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeneralModule } from '../general/general.module';
import { UsersModule } from '../users/users.module';
import { CandidatosController } from './candidatos.controller';
import { CandidatosService } from './candidatos.service';
import { PublicCandidatosController } from './public-candidatos.controller';

@Module({
  imports: [AuthModule, UsersModule, GeneralModule],
  controllers: [CandidatosController, PublicCandidatosController],
  providers: [CandidatosService],
})
export class CandidatosModule {}
