FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY types ./types
COPY backend ./backend

EXPOSE 9000

CMD ["npm", "run", "start:backend:docker"]

