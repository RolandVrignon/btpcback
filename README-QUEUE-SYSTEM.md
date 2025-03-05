# Système de File d'Attente pour les Connexions à la Base de Données

## Problème Résolu

Ce système a été mis en place pour résoudre les erreurs de type :
```
Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 9)
```

Ces erreurs se produisent lorsque trop de connexions simultanées sont tentées vers la base de données, dépassant la limite du pool de connexions.

## Solution Implémentée

### 1. File d'Attente dans PrismaService

Nous avons modifié le service Prisma pour implémenter une file d'attente qui limite le nombre d'opérations concurrentes sur la base de données :

- Un maximum de 5 opérations simultanées est autorisé
- Les opérations supplémentaires sont mises en file d'attente et exécutées lorsque des slots se libèrent
- La configuration utilise l'URL de la base de données depuis les variables d'environnement

### 2. Méthode `executeWithQueue`

Une nouvelle méthode `executeWithQueue` a été ajoutée au service Prisma. Cette méthode :
- Accepte une fonction qui effectue une opération sur la base de données
- Place cette opération dans une file d'attente si le nombre maximum d'opérations concurrentes est atteint
- Exécute l'opération dès qu'un slot est disponible
- Gère les erreurs et les résolutions de promesses

### 3. Modification des Repositories

Tous les repositories ont été modifiés pour utiliser cette nouvelle méthode :
- `OrganizationsRepository`
- `ApikeysRepository`
- `ProjectsRepository`
- `DocumentsRepository`
- `UsageRepository`
- `ChunksRepository`
- `EmbeddingsRepository`

### 4. Traitement par Lots

La méthode `createChunksWithEmbeddings` dans `DocumentsService` a été modifiée pour traiter les chunks par lots de 5, plutôt que tous en parallèle, afin de réduire la charge sur la base de données.

## Comment Utiliser

Pour utiliser la file d'attente dans vos propres repositories, enveloppez vos opérations Prisma avec la méthode `executeWithQueue` :

```typescript
// Avant
const result = await this.prisma.someModel.findMany({...});

// Après
const result = await this.prisma.executeWithQueue(() =>
  this.prisma.someModel.findMany({...})
);
```

## Configuration

Vous pouvez ajuster le paramètre suivant dans `PrismaService` :
- `MAX_CONCURRENT_OPERATIONS` : nombre maximum d'opérations simultanées (actuellement 5)

### Calcul de MAX_CONCURRENT_OPERATIONS

La valeur optimale de `MAX_CONCURRENT_OPERATIONS` dépend de plusieurs facteurs :

1. **Limite du pool de connexions** : Notre pool a une limite de 9 connexions
2. **Formule recommandée** : `(limite_pool_connexions * 0.7) - connexions_réservées`
3. **Calcul pour notre cas** : `(9 * 0.7) - 1 ≈ 5`

Cette valeur de 5 permet de :
- Éviter de saturer le pool de connexions
- Laisser une marge pour d'autres connexions système
- Maintenir une performance optimale

## Avantages

- Évite les erreurs de dépassement du pool de connexions
- Améliore la stabilité de l'application
- Permet de gérer un plus grand nombre de requêtes sans erreur
- Maintient une charge raisonnable sur la base de données

## Limitations

- Peut augmenter légèrement le temps de réponse pour certaines opérations
- Ne remplace pas l'optimisation des requêtes ou l'augmentation des ressources de la base de données si nécessaire

## Surveillance et Ajustement

Pour optimiser cette valeur :
1. Surveillez les métriques de performance de votre base de données
2. Observez le nombre de connexions actives pendant les périodes de charge
3. Ajustez progressivement la valeur (augmentez de 1 ou 2 à la fois)
4. Testez sous charge pour vérifier la stabilité