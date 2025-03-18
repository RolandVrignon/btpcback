import { Injectable } from '@nestjs/common';
import { CityDocumentsDto } from './dto/city-documents.dto';
import { CityDocumentsResponse } from './interfaces/city-documents.interface';

@Injectable()
export class ToolsService {
  constructor() {}

  /**
   * Récupère des documents publics relatifs à une ville
   * @param cityDocumentsDto Paramètres de recherche (ville, code postal, pays, etc.)
   * @returns Documents publics de la ville
   */
  async getCityDocuments(
    cityDocumentsDto: CityDocumentsDto,
  ): Promise<CityDocumentsResponse> {
    try {
      const n8nUrl = process.env.N8N_WEBHOOK_URL_PROD;

      const city = cityDocumentsDto.city;

      const url = `${n8nUrl}/public-docs?ville=${city}`;

      console.log(url);

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = (await response.json()) as CityDocumentsResponse;

      return data;
    } catch {
      console.error('tools > tools.service.ts > TOOLS GetCityDocuments error');
      return null;
    }
  }
}
