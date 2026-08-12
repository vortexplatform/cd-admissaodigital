import { IsNotEmpty, IsString } from 'class-validator';

export class LoginPasswordDto {
  @IsString()
  @IsNotEmpty()
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
