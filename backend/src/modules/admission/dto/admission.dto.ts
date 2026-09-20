import {
  IsString, IsOptional, IsUUID, IsInt, IsEnum, IsDateString, Min, Max, IsNotEmpty, IsNumber,
} from 'class-validator';
import {
  type_etablissement,
  statut_etablissement,
  mode_selection,
  statut_session_admission,
  statut_inscription,
  politique_candidature_concurrente,
  type_piece_candidature,
} from '@prisma/client';

export class CreateFiliereDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() libelle: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() ordre?: number;
}

export class CreateNiveauDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() libelle: string;
  @IsInt() ordre: number;
}

export class CreateFormationReferentielDto {
  @IsUUID() filiereId: string;
  @IsUUID() niveauId: string;
  @IsString() @IsNotEmpty() libelle: string;
  @IsOptional() @IsString() description?: string;
}

export class CreatePrerequisDto {
  @IsUUID() niveauCibleId: string;
  @IsUUID() niveauRequisId: string;
}

export class CreateSessionAdmissionDto {
  @IsUUID() filiereId: string;
  @IsUUID() niveauId: string;
  @IsOptional() @IsUUID() formationId?: string;
  @IsOptional() @IsUUID() etablissementId?: string;
  @IsString() @IsNotEmpty() libelle: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() piecesRequises?: string[];
  @IsOptional() @IsEnum(mode_selection) modeSelection?: mode_selection;
  @IsOptional() @IsInt() @Min(1) @Max(500) capacite?: number;
  @IsDateString() dateOuverture: string;
  @IsDateString() dateFermeture: string;
  @IsDateString() dateDebutFormation: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) delaiConfirmationJours?: number;
  @IsOptional() etablissementsPartages?: string[];
}

export class UpdateSessionStatutDto {
  @IsEnum(statut_session_admission) statut: statut_session_admission;
}

export class UpdatePartageSessionDto {
  etablissementIds: string[];
}

export class UpdateSessionAdmissionDto {
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() piecesRequises?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(500) capacite?: number;
  @IsOptional() etablissementsPartages?: string[];
}

export class CreateCandidatureDto {
  @IsUUID() sessionId: string;
}

export class DecisionCandidatureDto {
  @IsEnum(['ADMIS', 'LISTE_ATTENTE', 'REJETE'])
  decision: 'ADMIS' | 'LISTE_ATTENTE' | 'REJETE';

  @IsOptional() @IsNumber() scoreEvaluation?: number;
  @IsOptional() @IsString() motifRejet?: string;
  @IsOptional() @IsString() commentaireGestionnaire?: string;
}

export class UpdateInscriptionStatutDto {
  @IsEnum(statut_inscription) statut: statut_inscription;
}

export class InscrireApprenantDto {
  @IsUUID() apprenantId: string;
  @IsUUID() formationId: string;
  @IsOptional() @IsUUID() sessionId?: string;
  @IsOptional() @IsEnum(statut_inscription) statut?: statut_inscription;
}

export class UpdateParametresReseauDto {
  @IsOptional() @IsEnum(politique_candidature_concurrente)
  politiqueCandidatureConcurrente?: politique_candidature_concurrente;

  @IsOptional() @IsInt() @Min(1) @Max(20) maxVoeuxParApprenant?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60) delaiConfirmationDefautJours?: number;
  @IsOptional() @IsString() matriculePrefixe?: string;
}

export class UpdateAutonomieDto {
  @IsOptional() parametresAutonomie?: Record<string, unknown>;
  @IsOptional() reglementLocal?: Record<string, unknown>;
}

export class UpdateEtablissementStatutDto {
  @IsEnum(statut_etablissement) statut: statut_etablissement;
}

export class CreateSatelliteDto {
  @IsString() @IsNotEmpty() nom: string;
  @IsString() @IsNotEmpty() adresse: string;
  @IsOptional() @IsString() codeAntenne?: string;
  @IsOptional() @IsEnum(type_etablissement) typeEtablissement?: type_etablissement;
  @IsOptional() @IsString() pays?: string;
  @IsOptional() @IsString() fuseauHoraire?: string;
  @IsOptional() @IsString() langueDefaut?: string;
}

export { type_piece_candidature };
