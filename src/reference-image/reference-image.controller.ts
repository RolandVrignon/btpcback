import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ReferenceImageService } from '@/reference-image/reference-image.service';

@Controller('reference-image')
export class ReferenceImageController {
  constructor(private readonly referenceImageService: ReferenceImageService) {}

  @Get(':id')
  async getImageById(@Param('id') id: string, @Res() res: Response) {
    // Retrieve image buffer from service
    const image = await this.referenceImageService.getImageById(
      id.replace('.jpeg', ''),
    );
    console.log('image', image);
    if (!image) {
      throw new NotFoundException('Image not found');
    }
    console.log('Image buffer size:', image.length);
    // Set content type and send image buffer
    const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image);

    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  }
}
