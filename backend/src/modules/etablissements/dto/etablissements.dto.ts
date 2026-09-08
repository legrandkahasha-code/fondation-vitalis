import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { type_etablissement } from '@prisma/client';

export class CreateEtablissementDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'établissement est requis.' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'L\'adresse de l\'établissement est requise.' })
  adresse: string;

  @IsOptional()
  @IsString()
  codeAntenne?: string;

  @IsOptional()
  @IsEnum(type_etablissement)
  typeEtablissement?: type_etablissement;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  fuseauHoraire?: string;

  @IsOptional()
  @IsString()
  langueDefaut?: string;
}

export class UpdateEtablissementDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide.' })
  nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'L\'adresse ne peut pas être vide.' })
  adresse?: string;

  @IsOptional()
  @IsString()
  codeAntenne?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  fuseauHoraire?: string;

  @IsOptional()
  @IsString()
  langueDefaut?: string;
}
