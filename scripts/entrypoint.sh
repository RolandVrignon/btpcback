#!/bin/sh
set -e

# Afficher les informations de démarrage
echo "Démarrage du conteneur..."
echo "DATABASE_URL: $DATABASE_URL"

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "ERREUR: La variable DATABASE_URL n'est pas définie!"
  exit 1
fi

# Générer le client Prisma avec la variable DATABASE_URL fournie au runtime
echo "Génération du client Prisma..."
npx prisma generate

# Exécuter les migrations Prisma si nécessaire (optionnel)
# echo "Exécution des migrations Prisma..."
# npx prisma migrate deploy

# Exécuter le script de configuration RDS si nécessaire (optionnel)
if [ "$CONFIGURE_RDS" = "true" ]; then
  echo "Configuration de la sécurité RDS..."
  npx ts-node scripts/configure-rds-security_back.ts
fi

# Démarrer l'application
echo "Démarrage de l'application..."
exec node dist/src/main