import { ApiProperty } from '@nestjs/swagger';

export class CreateBucketResponseDto {
  @ApiProperty({
    description: 'Nom du bucket S3 créé',
    example: 'mon-bucket',
  })
  bucketName: string;

  @ApiProperty({
    description: 'URL de localisation du bucket',
    example: 'https://mon-bucket.s3.amazonaws.com',
  })
  location: string;
}
