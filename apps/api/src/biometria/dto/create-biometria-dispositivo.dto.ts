import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBiometriaDispositivoDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}
