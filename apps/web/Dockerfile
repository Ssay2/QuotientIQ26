FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json .
COPY .editorconfig .

RUN npm install

WORKDIR /app/apps/web

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
