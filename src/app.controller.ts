import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Accueil')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Page d'accueil de l'API" })
  @ApiResponse({
    status: 200,
    description: 'Message de bienvenue',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
