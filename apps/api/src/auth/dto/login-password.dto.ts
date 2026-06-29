import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
