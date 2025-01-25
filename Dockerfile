FROM node:22-alpine

WORKDIR /app

# install git
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

CMD [ "node", "/app/dist/index.js" ]
