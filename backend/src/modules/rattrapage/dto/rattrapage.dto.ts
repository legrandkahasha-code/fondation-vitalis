import { IsUUID, IsDateString, IsOptional, IsString, IsNumber, Min, Max, IsInt, IsEnum } from 'class-validator';

export enum StatutRattrapageEnum {
  PROGRAMME = 'PROGRAMME',
  EN_COURS = 'EN_COURS',
  CLOTURE = 'CLOTURE',
  ANNULE = 'ANNULE',
}

export enum StatutCandidatRattrapageEnum {
  CONVOQUE = 'CONVOQUE',
  INSCRIT = 'INSCRIT',
  ABSENT_JUSTIFIE = 'ABSENT_JUSTIFIE',
  ABSENT_INJUSTIFIE = 'ABSENT_INJUSTIFIE',
  NOTE_SAISIE = 'NOTE_SAISIE',
}

export class CreerSessionRattrapageDto {
  @IsUUID()
  moduleId: string;

  @IsUUID()
  formationId: string;

  @IsDateString()
  dateSession: string;

  @IsOptional()
  @IsString()
  salleOuLien?: string;

  @IsUUID()
  formateurId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  notePlafond?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sessionNumero?: number;

  @IsOptional()
  @IsString()
  remarques?: string;
}

export class InscrireCandidatRattrapageDto {
  @IsUUID()
  apprenantId: string;

  @IsNumber()
  @Min(0)
  @Max(20)
  noteInitiale: number;

  @IsOptional()
  @IsString()
  remarques?: string;
}

export class SaisirNoteRattrapageDto {
  @IsNumber()
  @Min(0)
  @Max(20)
  noteRattrapage: number;

  @IsOptional()
  @IsEnum(StatutCandidatRattrapageEnum)
  statut?: StatutCandidatRattrapageEnum;

  @IsOptional()
  @IsString()
  remarques?: string;
}

export class UpdateStatutSessionDto {
  @IsEnum(StatutRattrapageEnum)
  statut: StatutRattrapageEnum;
}
