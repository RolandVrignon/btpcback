import { Injectable } from '@nestjs/common';
import { CityDocumentsDto } from './dto/city-documents.dto';
import { CityDocumentsResponse } from './interfaces/city-documents.interface';
import { PublicDataDto } from './dto/public-data.dto';
import { PublicDataResponse } from './interfaces/public-data.interface';

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

  /**
   * Retrieves public data for a specific city and address
   * @param publicDataDto Parameters containing city and address
   * @returns Public data related to the location
   */
  async getPublicData(
    publicDataDto: PublicDataDto,
  ): Promise<PublicDataResponse> {
    try {
      const n8nUrl = process.env.N8N_WEBHOOK_URL_PROD;

      const address = `${publicDataDto.address}, ${publicDataDto.city}`;

      const url = `${n8nUrl}/public-data`;

      console.log(url);

      const payload = {
        address,
        publicDataType: 'GEORISQUES',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as PublicDataResponse;

      return data;
    } catch {
      console.error('tools > tools.service.ts > TOOLS GetPublicData error');
      return null;
    }
  }
}
