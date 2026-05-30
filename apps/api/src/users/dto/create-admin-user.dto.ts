import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  role?: Role.RH | Role.ADMIN;

  @IsInt()
  empresaId!: number;
}
