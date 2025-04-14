import { PartialType } from '@nestjs/mapped-types';
import { CreateChunkDto } from '@/chunks/dto/create-chunk.dto';

export class UpdateChunkDto extends PartialType(CreateChunkDto) {}
