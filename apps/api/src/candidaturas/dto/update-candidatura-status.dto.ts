import { IsEnum } from 'class-validator';
import { StatusCandidatura } from '@prisma/client';

export class UpdateCandidaturaStatusDto {
  @IsEnum(StatusCandidatura)
  status!: StatusCandidatura;
}
