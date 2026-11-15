FROM node:20

WORKDIR /app

COPY server/package*.json ./server/

WORKDIR /app/server

RUN npm install --omit=dev

WORKDIR /app

COPY server ./server
COPY client ./client

EXPOSE 3000

CMD ["node", "server/server.js"]
