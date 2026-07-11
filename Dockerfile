FROM node:22-alpine

WORKDIR /app

# Installiere OpenSSL für Prisma
RUN apk add --no-cache openssl

# 1. FRONTEND BILDEN
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# 2. BACKEND BILDEN
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend ./backend
RUN cd backend && npx prisma generate && npm run build

# 3. START SCRIPT
ENV NODE_ENV=production
ENV PORT=3000

# Erstelle Startskript
RUN echo "#!/bin/sh" > start.sh
RUN echo "cd backend && npx prisma db push && node dist/index.js" >> start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
