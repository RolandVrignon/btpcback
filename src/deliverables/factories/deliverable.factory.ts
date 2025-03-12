import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliverableType } from '@prisma/client';
import { BaseDeliverableStrategy } from '../strategies/base-deliverable.strategy';
import { DescriptifSommaireDesTravauxStrategy } from '../strategies/descriptif-sommaire-des-travaux.strategy';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliverableFactory {
  private strategies: Map<DeliverableType, BaseDeliverableStrategy>;

  constructor(private readonly prisma: PrismaService) {
    this.strategies = new Map();
    this.registerStrategies();
  }

  private registerStrategies(): void {
    // Enregistrer toutes les stratégies disponibles
    this.strategies.set(
      'DESCRIPTIF_SOMMAIRE_DES_TRAVAUX' as DeliverableType,
      new DescriptifSommaireDesTravauxStrategy(this.prisma),
    );

    // TODO: Ajouter les autres stratégies au fur et à mesure
    // this.strategies.set(DeliverableType.COMPARATEUR_INDICES, new IndexComparisonStrategy(this.prisma));
    // this.strategies.set(DeliverableType.ANALYSE_ETHUDE_THERMIQUE, new ThermalStudyStrategy(this.prisma));
    // this.strategies.set(DeliverableType.INCOHERENCE_DE_DONNEES, new DataInconsistencyStrategy(this.prisma));
  }

  getStrategy(type: DeliverableType): BaseDeliverableStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new NotFoundException(
        `Strategy not found for deliverable type: ${type}`,
      );
    }
    return strategy;
  }
}
