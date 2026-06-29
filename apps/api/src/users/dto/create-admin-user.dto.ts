import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  nome!: string;

  @IsString()
  cpf!: string;

  @ValidateIf((dto: CreateAdminUserDto) => !dto.telefone)
  @IsEmail()
  email?: string;

  @ValidateIf((dto: CreateAdminUserDto) => !dto.email)
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsInt()
  empresaId!: number;
}
