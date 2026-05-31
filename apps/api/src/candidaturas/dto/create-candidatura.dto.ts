import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CreateCandidaturaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  candidatoId!: number;
}
