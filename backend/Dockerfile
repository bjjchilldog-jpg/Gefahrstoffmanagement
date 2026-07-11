FROM node:18-alpine

WORKDIR /app

# Kopiere Package-Dateien
COPY package*.json ./
COPY prisma ./prisma/

# Installiere Abhängigkeiten
RUN npm install

# Generiere Prisma Client
RUN npx prisma generate

# Kopiere den restlichen Code
COPY . .

# Baue TypeScript
RUN npx tsc

# Setze Umgebungsvariablen
ENV NODE_ENV=production
ENV PORT=3000

# Erstelle ein Start-Skript für Prisma-Migrationen und Start
RUN echo "npx prisma db push && node dist/index.js" > start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["sh", "./start.sh"]
