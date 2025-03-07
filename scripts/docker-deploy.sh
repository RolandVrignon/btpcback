#!/bin/bash

# Vérifier que le fichier .env.docker existe
if [ ! -f .env.docker ]; then
  echo "Erreur: Le fichier .env.docker n'existe pas."
  echo "Veuillez créer ce fichier avec les variables d'environnement nécessaires."
  exit 1
fi

# Arrêter les conteneurs existants
echo "Arrêt des conteneurs existants..."
docker-compose down

# Construire les images
echo "Construction des images Docker..."
docker-compose build

# Démarrer les conteneurs avec le fichier .env.docker
echo "Démarrage des conteneurs avec les variables d'environnement de .env.docker..."
docker-compose up -d

# Attendre que la base de données soit prête
echo "Attente de la disponibilité de la base de données..."
sleep 10

# Exécuter les migrations Prisma
echo "Exécution des migrations Prisma..."
docker-compose exec api npx prisma migrate deploy

echo "Déploiement terminé avec succès !"
echo "Pour voir les logs de l'API, exécutez: docker-compose logs -f api"

# Afficher les conteneurs en cours d'exécution
echo "Conteneurs en cours d'exécution:"
docker-compose ps