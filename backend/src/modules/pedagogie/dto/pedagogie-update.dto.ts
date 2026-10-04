import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @IsOptional()
  @IsNumber()
  ordre?: number;
}

export class UpdateCoursDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsNumber()
  dureeMinutes?: number;
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  noteMaximale?: number;
}
