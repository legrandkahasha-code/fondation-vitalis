import { IsString, IsOptional, IsNumber, Min, IsUUID, IsEnum, IsDateString, IsArray, ArrayMinSize, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { type_seance, statut_presence } from '@prisma/client';

export class CreateFormationDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  duree?: string;

  @IsOptional()
  @IsString()
  categorie?: string; // 'tech' | 'gestion' | 'technique'

  @IsOptional()
  @IsString()
  debouches?: string;

  @IsOptional()
  @IsString()
  prerequis?: string;

  @IsOptional()
  @IsString()
  objectifs?: string;

  @IsOptional()
  @IsBoolean()
  publieSurLanding?: boolean;

  @IsOptional()
  @IsBoolean()
  aLaUne?: boolean;

  @IsOptional()
  @IsString()
  badgeTexte?: string;

  @IsOptional()
  @IsNumber()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsNumber()
  fraisInscription?: number;

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
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  duree?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  debouches?: string;

  @IsOptional()
  @IsString()
  prerequis?: string;

  @IsOptional()
  @IsString()
  objectifs?: string;

  @IsOptional()
  @IsBoolean()
  publieSurLanding?: boolean;

  @IsOptional()
  @IsBoolean()
  aLaUne?: boolean;

  @IsOptional()
  @IsString()
  badgeTexte?: string;

  @IsOptional()
  @IsNumber()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsNumber()
  fraisInscription?: number;

  @IsOptional()
  @IsUUID()
  formationReferentielId?: string;

  @IsOptional()
  @IsUUID()
  etablissementId?: string;
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

export class CreateCategorieFormationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  libelle: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsNumber()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateCategorieFormationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsNumber()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

