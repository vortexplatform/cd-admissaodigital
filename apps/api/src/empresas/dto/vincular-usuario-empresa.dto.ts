import { IsInt } from 'class-validator';

export class VincularUsuarioEmpresaDto {
  @IsInt()
  userId!: number;
}
