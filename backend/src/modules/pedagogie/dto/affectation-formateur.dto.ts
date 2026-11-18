import { IsUUID, IsBoolean, IsOptional, IsInt, Min, IsNumber, IsString, IsDateString, IsEnum } from 'class-validator';

export enum StatutHabilitationEnum {
  EN_ATTENTE = 'EN_ATTENTE',
  HABILITE = 'HABILITE',
  EXPIRE = 'EXPIRE',
  SUSPENDU = 'SUSPENDU',
}

export class AffecterFormateurDto {
  @IsUUID()
  formateurId: string;

  @IsOptional()
  @IsBoolean()
  estCoordonnateur?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  heuresAllouees?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeCmHeures?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeTdHeures?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeTpHeures?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tauxHoraire?: number;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;
}

export class UpdateAffectationFormateurDto {
  @IsOptional()
  @IsBoolean()
  estCoordonnateur?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  heuresAllouees?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeCmHeures?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeTdHeures?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  volumeTpHeures?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heuresEffectuees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tauxHoraire?: number;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;
}

export class CreerHabilitationDto {
  @IsUUID()
  formateurId: string;

  @IsString()
  discipline: string;

  @IsOptional()
  @IsString()
  niveauMax?: string;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;

  @IsOptional()
  @IsString()
  piecesJointesUrl?: string;
}

export class UpdateHabilitationDto {
  @IsOptional()
  @IsEnum(StatutHabilitationEnum)
  statut?: StatutHabilitationEnum;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;

  @IsOptional()
  @IsString()
  piecesJointesUrl?: string;

  @IsOptional()
  @IsString()
  niveauMax?: string;
}
