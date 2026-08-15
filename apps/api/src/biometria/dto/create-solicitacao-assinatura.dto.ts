import { IsIP, IsNotEmpty, IsString } from 'class-validator';

export class CreateSolicitacaoAssinaturaDto {
  @IsString()
  @IsNotEmpty()
  @IsIP('4')
  idfaceIp!: string;
}
