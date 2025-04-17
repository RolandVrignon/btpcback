# Étape de build
FROM node:20-alpine AS build

# Installer pnpm
RUN npm install -g pnpm@10.6.5

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json ./

# Installer les dépendances et approuver explicitement les scripts
RUN pnpm install
RUN pnpm approve-builds @nestjs/core @prisma/client @swc/core esbuild prisma

# Copier le reste des fichiers
COPY . .

# Générer le client Prisma avec une URL factice pour la compilation
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"
RUN npx prisma generate

# Construire le client iframe avec scripts approuvés
WORKDIR /app/chat-iframe-client
RUN pnpm install
RUN pnpm approve-builds @nestjs/core @prisma/client @swc/core esbuild prisma
RUN pnpm build

# Lister le contenu du dossier /app/public/chat
RUN ls -la /app/public/chat || echo "Dossier /app/public/chat non trouvé"
RUN ls -la /app/public/chat/assets || echo "Dossier /app/public/chat/assets non trouvé"
RUN ls -la /app/ || echo "Dossier /app/ non trouvé"
# Retourner au répertoire principal et construire l'application backend
WORKDIR /app
RUN pnpm run build

# Étape de production
FROM node:20-alpine AS production

# Installer poppler-utils pour pdfinfo
RUN apk update && apk add --no-cache poppler-utils

# Installer pnpm, prisma CLI, typescript et ts-node globalement
RUN npm install -g pnpm prisma typescript ts-node

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer toutes les dépendances
RUN pnpm install --unsafe-perm

# Copier les fichiers générés depuis l'étape de build
COPY --from=build /app/dist ./dist
# S'assurer que tous les fichiers publics sont copiés, y compris le dossier assets
COPY --from=build /app/public ./public
COPY prisma ./prisma
COPY scripts ./scripts
COPY tsconfig.json ./

# Créer le répertoire pour les fichiers temporaires
RUN mkdir -p /tmp/document-processing
RUN chmod 777 /tmp/document-processing

# Exposer le port
EXPOSE 8080

# Définir le script d'entrée comme point d'entrée
ENTRYPOINT ["/app/scripts/entrypoint.sh"]