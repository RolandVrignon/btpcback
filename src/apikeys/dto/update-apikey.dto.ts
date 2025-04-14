import { PartialType } from '@nestjs/mapped-types';
import { CreateApikeyDto } from '@/apikeys/dto/create-apikey.dto';

export class UpdateApikeyDto extends PartialType(CreateApikeyDto) {}
