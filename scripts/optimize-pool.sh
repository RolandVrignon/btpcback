#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Optimisation du pool de connexions PostgreSQL ===${NC}"

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${RED}Fichier .env non trouvé. Veuillez créer un fichier .env avec votre DATABASE_URL.${NC}"
    exit 1
fi

# Exécuter le script TypeScript avec npx
echo -e "${GREEN}Analyse et optimisation en cours...${NC}"
npx ts-node scripts/optimize-pool.ts

echo -e "\n${YELLOW}=== Comment appliquer les recommandations ===${NC}"
echo -e "1. ${GREEN}Modifiez votre fichier .env${NC} avec le paramètre connection_limit recommandé"
echo -e "2. ${GREEN}OU modifiez votre PrismaService${NC} avec la configuration suggérée"
echo -e "3. ${GREEN}Redémarrez votre application${NC} pour appliquer les changements"
echo -e "\n${YELLOW}=== Fin de l'optimisation ===${NC}"