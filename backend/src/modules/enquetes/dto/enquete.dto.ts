import {
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
} from 'class-validator';

export enum TypeEnqueteEnum {
  A_CHAUD = 'A_CHAUD',
  A_FROID = 'A_FROID',
}

export class SoumettreEnqueteDto {
  @IsUUID()
  formationId: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsUUID()
  formateurId: string;

  @IsEnum(TypeEnqueteEnum)
  typeEnquete: TypeEnqueteEnum;

  @IsOptional()
  @IsBoolean()
  anonyme?: boolean;

  @IsInt()
  @Min(1)
  @Max(5)
  pedagogieClarte: number;

  @IsInt()
  @Min(1)
  @Max(5)
  maitriseSujet: number;

  @IsInt()
  @Min(1)
  @Max(5)
  disponibilite: number;

  @IsInt()
  @Min(1)
  @Max(5)
  supportsCours: number;

  @IsInt()
  @Min(1)
  @Max(5)
  pertinenceTps: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impactEmploi?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  recommandationNps?: number;

  @IsOptional()
  @IsString()
  commentaires?: string;

  @IsOptional()
  @IsString()
  pointsForts?: string;

  @IsOptional()
  @IsString()
  axesAmelioration?: string;
}
