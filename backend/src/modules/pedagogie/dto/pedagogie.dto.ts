import { IsString, IsOptional, IsNumber, Min, IsUUID, IsEnum, IsDateString, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { type_seance, statut_presence } from '@prisma/client';

export class CreateFormationDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  formationReferentielId?: string;

  @IsOptional()
  @IsUUID()
  etablissementId?: string;
}

export class UpdateFormationDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateModuleDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @IsOptional()
  @IsNumber()
  ordre?: number;
}

export class CreateCoursDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class CreateEvaluationDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  noteMaximale?: number;
}

export class SubmitNoteDto {
  @IsUUID()
  utilisateurId: string;

  @IsNumber()
  valeur: number;
}

export class CreateSeanceDto {
  @IsUUID()
  moduleId: string;

  @IsOptional()
  @IsUUID()
  coursId?: string;

  @IsString()
  titreActivite: string;

  @IsEnum(type_seance)
  typeSession: type_seance;

  @IsDateString()
  dateHeureDebut: string;

  @IsDateString()
  dateHeureFin: string;

  @IsOptional()
  @IsString()
  salleOuLien?: string;
}

export class UpdateSeanceDto {
  @IsOptional() @IsString() titreActivite?: string;
  @IsOptional() @IsEnum(type_seance) typeSession?: type_seance;
  @IsOptional() @IsDateString() dateHeureDebut?: string;
  @IsOptional() @IsDateString() dateHeureFin?: string;
  @IsOptional() @IsString() salleOuLien?: string;
}

export class EmargementDto {
  @IsUUID()
  apprenantId: string;

  @IsEnum(statut_presence)
  statut: statut_presence;

  @IsOptional() @IsString() remarqueJustification?: string;
}

export class BulkEmargementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmargementDto)
  presences: EmargementDto[];
}
