import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CandidatosController } from './candidatos.controller';
import { CandidatosService } from './candidatos.service';

@Module({
  imports: [UsersModule],
  controllers: [CandidatosController],
  providers: [CandidatosService],
})
export class CandidatosModule {}
