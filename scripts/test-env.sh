#!/bin/sh
set -e

echo "Contenu des variables d'environnement:"
env | sort

echo "DATABASE_URL: $DATABASE_URL"
echo "CONFIGURE_RDS: $CONFIGURE_RDS"