import { BadRequestException, Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboard.getSummary();
  }

  @Get('colaboradores-admitidos')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  getColaboradoresAdmitidos(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('Informe o período de admissão.');
    }

    return this.dashboard.getColaboradoresAdmitidos({ dataInicio, dataFim, page, limit });
  }
}
