import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizReponseItemDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsInt()
  selectedIndex: number;
}

export class SubmitApprenantQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizReponseItemDto)
  reponses: QuizReponseItemDto[];
}

export class SauvegarderNotesDto {
  @IsString()
  notes: string;
}

export class PoserQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

