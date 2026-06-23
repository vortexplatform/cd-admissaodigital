import { IsNotEmpty, IsString } from 'class-validator';

export class IntegrationTokenDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
