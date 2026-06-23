import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class GerarAdmissaoDto {
  @IsInt()
  candidatoId!: number;

  @IsOptional()
  @IsInt()
  candidaturaId?: number;

  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'datadm deve estar no formato dd/MM/yyyy' })
  datadm!: string;
}
