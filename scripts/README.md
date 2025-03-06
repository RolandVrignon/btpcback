# Scripts de gestion des connexions PostgreSQL

Ce répertoire contient des scripts pour surveiller et optimiser les connexions à votre base de données PostgreSQL sur Amazon RDS.

## Prérequis

- Node.js v20.13.0 ou supérieur
- pnpm
- ts-node (installé automatiquement par les scripts si nécessaire)
- Un fichier `.env` avec votre `DATABASE_URL`

## Scripts disponibles

### 1. Vérification des connexions

```bash
./scripts/check-connections.sh
```

Ce script affiche un rapport détaillé sur l'état actuel des connexions à votre base de données PostgreSQL :
- Nombre maximum de connexions autorisées
- Nombre de connexions actives
- Détails des connexions par application et état
- Les connexions les plus anciennes
- Recommandations pour la configuration du pool

### 2. Surveillance en temps réel

```bash
./scripts/monitor-connections.sh
```

Ce script affiche un tableau de bord en temps réel qui se rafraîchit toutes les 5 secondes avec :
- Nombre de connexions actives et pourcentage d'utilisation
- États des connexions (active, idle, etc.)
- Top 5 des applications utilisant le plus de connexions
- Connexions les plus anciennes

Appuyez sur `Ctrl+C` pour quitter.

### 3. Optimisation du pool

```bash
./scripts/optimize-pool.sh
```

Ce script analyse votre utilisation des connexions sur une courte période et recommande une configuration optimale pour votre pool de connexions Prisma :
- Analyse l'utilisation actuelle des connexions
- Calcule la taille optimale du pool en fonction de votre charge
- Suggère des modifications pour votre fichier `.env` ou votre `PrismaService`

## Comment configurer le pool de connexions

### Option 1 : Via le fichier .env

Ajoutez le paramètre `connection_limit` à votre URL de connexion :

```
DATABASE_URL=postgresql://user:password@host:port/database?connection_limit=20
```

### Option 2 : Via le PrismaService

Modifiez votre `src/prisma/prisma.service.ts` :

```typescript
constructor() {
  super({
    log: ['info', 'warn', 'error'],
    datasourceUrl: process.env.DATABASE_URL,
    connection: {
      min: 3,  // Connexions minimales
      max: 20  // Connexions maximales
    }
  });
}
```

## Bonnes pratiques

1. **Taille du pool** : Configurez votre pool à environ 80% du `max_connections` de votre instance RDS.
2. **Surveillance régulière** : Exécutez `check-connections.sh` régulièrement pour surveiller l'utilisation.
3. **Ajustement progressif** : Augmentez progressivement la taille du pool en fonction de vos besoins.
4. **Équilibre** : Trop peu de connexions peut ralentir votre application, mais trop de connexions peut surcharger votre base de données.

## Dépannage

Si vous rencontrez des erreurs "too many connections", cela peut indiquer que :
1. Votre pool est trop grand par rapport à la limite de votre instance RDS
2. Votre application ne ferme pas correctement les connexions
3. Vous avez des connexions zombies qui restent ouvertes

Utilisez `monitor-connections.sh` pour identifier les connexions problématiques.