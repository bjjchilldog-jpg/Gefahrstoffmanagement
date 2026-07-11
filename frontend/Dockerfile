# Stage 1: Build React PWA
FROM node:18-alpine AS builder

WORKDIR /app

# Kopiere Package-Dateien
COPY package*.json ./

# Installiere Abhängigkeiten
RUN npm install

# Kopiere den gesamten Code
COPY . .

# Baue die Vite App (überspringt den strengen TSC-Check für Warnungen)
RUN npx vite build

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Kopiere gebaute Dateien in den Nginx-Ordner
COPY --from=builder /app/dist /usr/share/nginx/html

# Überschreibe Nginx-Config für SPA-Routing (React Router)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
