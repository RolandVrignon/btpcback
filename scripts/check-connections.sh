#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Vérification des connexions à la base de données PostgreSQL ===${NC}"

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${RED}Fichier .env non trouvé. Veuillez créer un fichier .env avec votre DATABASE_URL.${NC}"
    exit 1
fi

# Exécuter le script TypeScript avec npx
echo -e "${GREEN}Exécution du script de vérification...${NC}"
npx ts-node scripts/check-db-connections.ts

# Afficher des informations supplémentaires sur la configuration du pool
echo -e "\n${YELLOW}=== Comment configurer votre pool de connexions ===${NC}"
echo -e "Pour configurer le pool de connexions dans votre application NestJS avec Prisma :"
echo -e "1. ${GREEN}Dans votre fichier .env :${NC}"
echo -e "   Ajoutez le paramètre connection_limit à votre DATABASE_URL :"
echo -e "   DATABASE_URL=postgresql://user:password@host:port/database?connection_limit=20"
echo -e "\n2. ${GREEN}Ou dans votre PrismaService :${NC}"
echo -e "   constructor() {"
echo -e "     super({"
echo -e "       log: ['info', 'warn', 'error'],"
echo -e "       datasourceUrl: process.env.DATABASE_URL,"
echo -e "       // Ajoutez cette configuration"
echo -e "       connection: {"
echo -e "         max: 20  // Nombre recommandé de connexions"
echo -e "       }"
echo -e "     });"
echo -e "   }"
echo -e "\n${YELLOW}=== Fin du rapport ===${NC}"