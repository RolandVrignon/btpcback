import { ApiProperty } from '@nestjs/swagger';

class BucketDto {
  @ApiProperty({
    description: 'Nom du bucket S3',
    example: 'mon-bucket',
  })
  name: string;

  @ApiProperty({
    description: 'Date de création du bucket',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}

export class BucketListResponseDto {
  @ApiProperty({
    description: 'Liste des buckets S3',
    type: [BucketDto],
  })
  buckets: BucketDto[];
}
