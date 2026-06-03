import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ResultadoBiometriaDto {
  @IsIn(['APROVADO', 'REPROVADO', 'FALHOU'])
  resultado!: 'APROVADO' | 'REPROVADO' | 'FALHOU';

  @IsString()
  @IsOptional()
  cpfRetornado?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  identificadorExterno?: string;

  @IsString()
  @IsOptional()
  mensagem?: string;
}
