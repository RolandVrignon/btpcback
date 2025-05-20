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
      const result: {
        stream: NodeJS.ReadableStream;
        contentType?: string;
        contentLength?: string;
        contentDisposition?: string;
      } = await this.shortUrlService.getFileStreamFromUrl(longUrl);
      if (result.contentType) res.setHeader('Content-Type', result.contentType);
      if (result.contentLength)
        res.setHeader('Content-Length', result.contentLength);
      if (result.contentDisposition)
        res.setHeader('Content-Disposition', result.contentDisposition);
      result.stream.pipe(res);
    } catch {
      return res.status(404).json({
        message: 'URL not found',
        error: 'Not Found',
        statusCode: 404,
      });
    }
  }
}
