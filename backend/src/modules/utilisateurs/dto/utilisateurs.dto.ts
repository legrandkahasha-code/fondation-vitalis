import { IsEmail, IsNotEmpty, IsString, MinLength, IsUUID, IsBoolean, Matches, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @IsString()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères (Recommandation ANSSI).' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#~^+=<>[\]{}()|:;,.]).+$/,
    {
      message:
        'Le mot de passe doit comporter au moins une majuscule, une minuscule, un chiffre et un caractère spécial.',
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis.' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis.' })
  prenom: string;

  @IsUUID('4', { message: 'Identifiant d\'établissement invalide.' })
  etablissementId: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Rôle invalide.' })
  role?: Role;
}

export class LoginDto {
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis.' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class SetActifDto {
  @IsBoolean()
  actif: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'ancien mot de passe est requis.' })
  ancienMotDePasse: string;

  @IsString()
  @MinLength(12, { message: 'Le mot de passe doit contenir au moins 12 caractères (Norme ANSSI).' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#~^+=<>[\]{}()|:;,.]).+$/,
    {
      message:
        'Le nouveau mot de passe doit comporter au moins une majuscule, une minuscule, un chiffre et un caractère spécial.',
    },
  )
  nouveauMotDePasse: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis.' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis.' })
  prenom: string;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Rôle invalide.' })
  role?: Role;

  @IsOptional()
  @IsUUID('4', { message: 'Identifiant d\'établissement invalide.' })
  etablissementId?: string;
}

export class CreerDemandeRegularisationDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif de régularisation est obligatoire.' })
  motif: string;

  @IsString()
  @IsNotEmpty({ message: 'La description détaillée est obligatoire.' })
  description: string;

  @IsOptional()
  piecesDemandees?: string[];

  @IsString()
  @IsNotEmpty({ message: 'La date limite est obligatoire.' })
  dateLimite: string;
}

export class DecisionRegularisationDto {
  @IsString()
  @IsNotEmpty({ message: 'Le statut de décision est obligatoire.' })
  statut: 'REGULARISE' | 'CLOTURE' | 'REJETE';

  @IsOptional()
  @IsString()
  commentaire?: string;
}

export class UploadDocumentDossierDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre du document est obligatoire.' })
  titre: string;

  @IsString()
  @IsNotEmpty({ message: 'Le type de document est obligatoire.' })
  typeDocument: string;

  @IsOptional()
  @IsString()
  commentaire?: string;
}

