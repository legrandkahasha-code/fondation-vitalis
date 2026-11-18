import { IsString, IsOptional, IsDateString, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Number)
  @IsNumber({}, { message: 'La note doit être un nombre valide.' })
  @Min(0, { message: 'La note doit être au moins de 0.' })
  @Max(20, { message: 'La note ne peut pas dépasser 20.' })
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
