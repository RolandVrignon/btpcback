import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ShortUrlService } from './short-url.service';

@Controller('redirect')
export class ShortUrlController {
  constructor(private readonly shortUrlService: ShortUrlService) {}

  @Get(':id')
  async redirect(@Param('id') id: string, @Res() res: Response) {
    try {
      const longUrl = await this.shortUrlService.getLongUrl(id);
      return res.redirect(longUrl);
    } catch (e) {
      return res.status(404).json({
        message: 'URL not found',
        error: 'Not Found',
        statusCode: 404,
      });
    }
  }
}
