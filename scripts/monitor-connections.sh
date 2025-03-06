#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Démarrage du moniteur de connexions PostgreSQL ===${NC}"

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${RED}Fichier .env non trouvé. Veuillez créer un fichier .env avec votre DATABASE_URL.${NC}"
    exit 1
fi

# Exécuter le script TypeScript avec npx
echo -e "${GREEN}Démarrage du moniteur...${NC}"
npx ts-node scripts/monitor-connections.ts