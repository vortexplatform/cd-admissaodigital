import { Module } from '@nestjs/common';
import { GeneralController } from './general.controller';
import { GeneralService } from './general.service';
import { SeniorApiService } from './senior-api.service';

@Module({
  controllers: [GeneralController],
  providers: [GeneralService, SeniorApiService],
  exports: [SeniorApiService],
})
export class GeneralModule {}
