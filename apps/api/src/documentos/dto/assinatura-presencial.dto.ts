import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class PosicaoAssinaturaPresencialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1)
  largura!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1)
  altura!: number;
}
