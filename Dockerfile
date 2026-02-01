FROM --platform=${BUILDPLATFORM} node:24-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM node:24-alpine AS final
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle

CMD [ "node", "dist/index.js" ]
