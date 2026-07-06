import { IsDateString, IsOptional } from 'class-validator';

export class UpdateCandidaturaDataAdmissaoPrevistaDto {
  @IsDateString()
  @IsOptional()
  dataAdmissaoPrevista?: string | null;
}
