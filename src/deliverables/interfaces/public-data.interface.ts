import { ApiProperty } from '@nestjs/swagger';

// Interface pour un élément de risque
export interface RiskItem {
  present: boolean;
  libelle: string;
}

// Interface pour l'adresse
export interface AddressData {
  libelle: string;
  longitude: number;
  latitude: number;
}

// Interface pour la commune
export interface CommuneData {
  libelle: string;
  codePostal: string;
  codeInsee: string;
}

// Interface pour les risques naturels
export interface NaturalRisks {
  inondation: RiskItem;
  risqueCotier: RiskItem;
  seisme: RiskItem;
  mouvementTerrain: RiskItem;
  reculTraitCote: RiskItem;
  retraitGonflementArgile: RiskItem;
  avalanche: RiskItem;
  feuForet: RiskItem;
  eruptionVolcanique: RiskItem;
  cyclone: RiskItem;
  radon: RiskItem;
}

// Interface pour les risques technologiques
export interface TechnologicalRisks {
  icpe: RiskItem;
  nucleaire: RiskItem;
  canalisationsMatieresDangereuses: RiskItem;
  pollutionSols: RiskItem;
  ruptureBarrage: RiskItem;
  risqueMinier: RiskItem;
}

// Interface pour la réponse complète
export interface PublicDataResponse {
  adresse: AddressData;
  commune: CommuneData;
  url: string;
  risquesNaturels: NaturalRisks;
  risquesTechnologiques: TechnologicalRisks;
}

// Classes pour la documentation Swagger
export class RiskItemDto implements RiskItem {
  @ApiProperty({
    description: 'Indique si le risque est présent',
    example: true,
  })
  present: boolean;

  @ApiProperty({
    description: 'Libellé du risque',
    example: 'Inondation',
  })
  libelle: string;
}

export class AddressDataDto implements AddressData {
  @ApiProperty({
    description: 'Adresse complète',
    example: '12 Rue de la Paix 75002 Paris',
  })
  libelle: string;

  @ApiProperty({
    description: 'Longitude',
    example: 2.331303,
  })
  longitude: number;

  @ApiProperty({
    description: 'Latitude',
    example: 48.86914,
  })
  latitude: number;
}

export class CommuneDataDto implements CommuneData {
  @ApiProperty({
    description: 'Nom de la commune',
    example: 'Paris',
  })
  libelle: string;

  @ApiProperty({
    description: 'Code postal',
    example: '75002',
  })
  codePostal: string;

  @ApiProperty({
    description: 'Code INSEE',
    example: '75102',
  })
  codeInsee: string;
}

export class NaturalRisksDto implements NaturalRisks {
  @ApiProperty({ type: RiskItemDto })
  inondation: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  risqueCotier: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  seisme: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  mouvementTerrain: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  reculTraitCote: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  retraitGonflementArgile: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  avalanche: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  feuForet: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  eruptionVolcanique: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  cyclone: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  radon: RiskItemDto;
}

export class TechnologicalRisksDto implements TechnologicalRisks {
  @ApiProperty({ type: RiskItemDto })
  icpe: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  nucleaire: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  canalisationsMatieresDangereuses: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  pollutionSols: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  ruptureBarrage: RiskItemDto;

  @ApiProperty({ type: RiskItemDto })
  risqueMinier: RiskItemDto;
}

// Classe pour la documentation Swagger de la réponse complète
export class PublicDataResponseDto implements PublicDataResponse {
  @ApiProperty({ type: AddressDataDto })
  adresse: AddressDataDto;

  @ApiProperty({ type: CommuneDataDto })
  commune: CommuneDataDto;

  @ApiProperty({
    description: 'URL vers les détails des risques',
    example:
      'https://georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi/rapport2?typeForm=adresse&city=Paris&codeInsee=75102&lon=2.331303&lat=48.86914&adresse=12+Rue+de+la+Paix+75002+Paris',
  })
  url: string;

  @ApiProperty({ type: NaturalRisksDto })
  risquesNaturels: NaturalRisksDto;

  @ApiProperty({ type: TechnologicalRisksDto })
  risquesTechnologiques: TechnologicalRisksDto;
}