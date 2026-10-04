import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEmail,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validateur sécurisé pour URLs de médias (Images / Vidéos)
 * Empêche le SSRF en bloquant localhost, metadata AWS et plages IP privées.
 * Autorise les chemins relatifs légitimes /uploads/...
 */
export function IsSafeMediaUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSafeMediaUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined || value === '') return true;
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();

          // 1. Chemin d'upload local légitime (/uploads/...) sans path traversal
          if (trimmed.startsWith('/uploads/')) {
            return (
              !trimmed.includes('..') &&
              /^\/uploads\/[a-zA-Z0-9_\-\/.]+\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|mov|ogg)$/i.test(trimmed)
            );
          }

          // 2. URL absolue HTTP/HTTPS
          try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
              return false;
            }

            const hostname = parsed.hostname.toLowerCase();

            // Bloquer localhost et loopback IPv4/IPv6
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
              return false;
            }

            // Bloquer AWS / GCP Cloud Metadata
            if (hostname === '169.254.169.254') {
              return false;
            }

            // Bloquer adresses IP privées (RFC 1918 & CGN RFC 6598)
            if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
            if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
            if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
            if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
            if (hostname === '0.0.0.0') return false;

            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} doit être une URL publique sécurisée (http/https) ou un chemin de téléversement valide (/uploads/...). Les adresses privées et locales sont interdites.`;
        },
      },
    });
  };
}

export class UpdateLandingSettingsDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  @IsString()
  heroTitre?: string;

  @IsOptional()
  @IsString()
  heroSousTitre?: string;

  @IsOptional()
  @IsString()
  heroNumeroAgrement?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroBadge1Texte?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroBadge2Texte?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroBadge3Texte?: string;

  @IsOptional()
  @IsString()
  topbarTexte?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  statsLaureats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  statsTauxReussite?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  statsFilieres?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  statsTitresVerif?: number;

  @IsOptional()
  @IsString()
  ctaTitre?: string;

  @IsOptional()
  @IsString()
  ctaSousTitre?: string;

  @IsOptional()
  @IsString()
  formationsSurMesureTitre?: string;

  @IsOptional()
  @IsString()
  formationsSurMesureDescription?: string;

  @IsOptional()
  @IsString()
  verifTitre?: string;

  @IsOptional()
  @IsString()
  verifSousTitre?: string;

  @IsOptional()
  @IsString()
  verifExempleNumero?: string;

  @IsOptional()
  @IsString()
  contactAdresse?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactHoraires?: string;

  @IsOptional()
  @IsString()
  contactTelephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  whatsappMessage?: string;

  @IsOptional()
  @IsBoolean()
  whatsappActif?: boolean;

  @IsOptional()
  @IsString()
  footerDescription?: string;

  @IsOptional()
  @IsString()
  footerTutelleTexte?: string;

  @IsOptional()
  @IsString()
  footerCopyright?: string;

  @IsOptional()
  @IsString()
  footerBarreTexte?: string;

  @IsOptional()
  @IsBoolean()
  videoActif?: boolean;

  @IsOptional()
  @IsString()
  videoSousTitre?: string;

  @IsOptional()
  @IsString()
  videoTitre?: string;

  @IsOptional()
  @IsString()
  videoDescription?: string;

  @IsOptional()
  @IsString()
  videoBoutonPrincipal?: string;

  @IsOptional()
  @IsString()
  videoBoutonSecondaire?: string;

  @IsOptional()
  @IsString()
  videoBoutonSecondaireUrl?: string;

  @IsOptional()
  @IsString()
  videoPresentationUrl?: string;

  @IsOptional()
  @IsString()
  videoPosterUrl?: string;

  @IsOptional()
  @IsString()
  videoBadgeHaut?: string;

  @IsOptional()
  @IsString()
  videoBadgeBas?: string;

  @IsOptional()
  @IsString()
  videoTitreOverlay?: string;

  @IsOptional()
  @IsString()
  videoSousTitreOverlay?: string;

  @IsOptional()
  @IsString()
  videoLegende?: string;

  @IsOptional()
  @IsString()
  videoDuree?: string;

  @IsOptional()
  @IsString()
  socialLinkedin?: string;

  @IsOptional()
  @IsString()
  socialFacebook?: string;

  @IsOptional()
  @IsString()
  socialYoutube?: string;

  @IsOptional()
  @IsString()
  mapEmbedUrl?: string;

  @IsOptional()
  @IsString()
  liveActivityTexte?: string;
}

export class CreateLandingSectionDto {
  @IsString()
  typeSection: string; // 'avantage' | 'pedagogie' | 'admission' | 'secteur' | 'faq'

  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  sousTitre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingSectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  @IsString()
  typeSection?: string;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  sousTitre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  icone?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class CreateLandingTemoignageDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  initiales?: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  fonction?: string;

  @IsOptional()
  @IsString()
  entreprise?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  note?: number;

  @IsOptional()
  @IsString()
  promotion?: string;

  @IsString()
  citation: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingTemoignageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  initiales?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  fonction?: string;

  @IsOptional()
  @IsString()
  entreprise?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  note?: number;

  @IsOptional()
  @IsString()
  promotion?: string;

  @IsOptional()
  @IsString()
  citation?: string;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

// --- FORMATEURS DTO ---
export class CreateLandingFormateurDto {
  @IsString()
  nom: string;

  @IsString()
  titre: string;

  @IsString()
  specialite: string;

  @IsString()
  experience: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingFormateurDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  specialite?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

// --- CAMPUS ESPACES DTO ---
export class CreateLandingCampusDto {
  @IsString()
  titre: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsString()
  equipements: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingCampusDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  equipements?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

// --- PARTENAIRES DTO ---
export class CreateLandingPartenaireDto {
  @IsString()
  nom: string;

  @IsString()
  logoUrl: string;

  @IsOptional()
  @IsString()
  secteur?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingPartenaireDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  secteur?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

// --- NEWSLETTER DTO ---
export class NewsletterSubscribeDto {
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;
}

export class ContactMessageDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit comporter au moins 2 caractères.' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères.' })
  nom: string;

  @IsString()
  @Matches(/^[+]?[0-9\s\-().]{6,25}$/, {
    message: 'Numéro de téléphone invalide (ex: +243 81 234 56 78).',
  })
  telephone: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Le nom de filière ne peut pas dépasser 150 caractères.' })
  filiere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Le message ne peut pas dépasser 2000 caractères.' })
  message?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  honeypot?: string;
}

export class CreateLandingActualiteDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  chapeau?: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  imageUrl?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  badgeCouleur?: string;

  @IsOptional()
  @IsString()
  datePublication?: string;

  @IsOptional()
  @IsString()
  auteur?: string;

  @IsOptional()
  @IsBoolean()
  aLaUne?: boolean;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateLandingActualiteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  chapeau?: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  imageUrl?: string;

  @IsOptional()
  @IsSafeMediaUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  badgeCouleur?: string;

  @IsOptional()
  @IsString()
  datePublication?: string;

  @IsOptional()
  @IsString()
  auteur?: string;

  @IsOptional()
  @IsBoolean()
  aLaUne?: boolean;

  @IsOptional()
  @IsInt()
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
