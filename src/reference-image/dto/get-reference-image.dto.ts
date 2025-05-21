import { IsString } from 'class-validator';

export class GetReferenceImageDto {
  // Image id to fetch
  @IsString()
  id: string;
}
