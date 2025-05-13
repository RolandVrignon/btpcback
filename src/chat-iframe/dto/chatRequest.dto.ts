import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AI_MODEL } from '../tools/streamConfig';

export class ChatRequestDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsString()
  @IsOptional()
  @IsEnum(AI_MODEL)
  model?: string;
}

export class ChatMessageDto {
  @IsIn(['user', 'assistant', 'system', 'tool'])
  role: 'user' | 'assistant' | 'system' | 'tool';

  @IsString()
  content: string;

  // facultatif
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  parts?: any[];

  // Ajouter la propriété toolInvocations ici
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolInvocation)
  toolInvocations?: ToolInvocation[];
}

// DTO pour `toolInvocations`
export class ToolInvocation {
  @IsString()
  toolCallId: string;

  @IsString()
  toolName: string;

  @IsObject()
  result: Record<string, any>;

  @IsString()
  state: string;

  @IsOptional()
  @IsNumber()
  step?: number;

  @IsOptional()
  @IsObject()
  args?: Record<string, any>;
}
