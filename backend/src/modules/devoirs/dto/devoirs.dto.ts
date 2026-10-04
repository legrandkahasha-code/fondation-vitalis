import { IsString, IsOptional, IsDateString, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateDevoirDto {
  @IsString()
  titre!: string;

  @IsOptional()
  @IsString()
  consignes?: string;

  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @IsOptional()
  criteresEvaluation?: any;
}

export class NoterDevoirDto {
  @IsNumber()
  @Min(0)
  note!: number;

  @IsOptional()
  @IsString()
  commentaire?: string;
}

export class UpdateDevoirDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  consignes?: string;

  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @IsOptional()
  criteresEvaluation?: any;
}
