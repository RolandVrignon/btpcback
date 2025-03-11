#!/bin/bash

# Vérifier si postgresql-client est installé
if ! command -v psql &> /dev/null || ! command -v pg_isready &> /dev/null; then
    echo "❌ Les outils PostgreSQL ne sont pas installés."
    echo "📦 Veuillez installer postgresql-client avec la commande:"
    echo "   sudo apt-get install postgresql-client"
    exit 1
fi

# Charger les variables d'environnement depuis .env
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Afficher l'en-tête
echo "🔍 Vérification du statut de la base de données..."

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL n'est pas défini"
    exit 1
fi

# Extraire les informations de DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Afficher les informations de connexion
echo "📊 Informations de connexion:"
echo "  • Host: $DB_HOST"
echo "  • Port: $DB_PORT"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"

# Vérifier la connexion avec pg_isready
echo -n "🔌 Test de connexion: "
if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
    echo "✅ Connexion réussie!"
else
    echo "❌ Échec de la connexion"
    exit 1
fi

# Vérifier la taille de la base de données avec psql
echo "📦 Statistiques de la base de données:"
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    pg_size_pretty(pg_database_size('$DB_NAME')) as db_size,
    (SELECT count(*) FROM pg_stat_activity) as active_connections,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count;"

echo "✨ Vérification terminée!"